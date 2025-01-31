const { initializeFirebase, verifyToken } = require("../config/firebaseConfig");
const Post = require("../models/post");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/user");

// Initialize Firebase Admin
initializeFirebase();

// Utility function to ensure upload directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Define upload directory for media
const uploadDir = path.join(__dirname, "../uploads/post-media");
ensureDirectoryExists(uploadDir);

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Directory where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueName = `media-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName); // Generate a unique filename
  },
});

// Initialize multer upload middleware for multiple files
const upload = multer({ storage });

// Utility function to delete files from the file system
const deleteFiles = (filePaths) => {
  filePaths.forEach((filePath) => {
    const fullPath = path.join(__dirname, "..", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath); // Delete the file from the filesystem
    }
  });
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    const userId = req.user.uid;
    const username = req.user.name || req.user.email;
    const profilePic = req.user.picture || "";
    const media = req.files.map((file) => `/uploads/post-media/${file.filename}`);

    const post = new Post({
      userId,
      username,
      profilePic,
      title,
      description,
      media,
    });
    await post.save();

    const postUrl = `${req.protocol}://${req.get("host")}/posts/${post._id}`;

    res.status(201).json({
      message: "Post created successfully",
      post: { ...post.toObject(), url: postUrl },
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
};

// Fetch posts with pagination
const getPosts = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    // Fetch posts with pagination
    const posts = await Post.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Extract unique user IDs from posts
    const userIds = [...new Set(posts.map((post) => post.userId))];

    // Fetch user profiles (name & profilePic) in a single query
    const users = await User.find({ uid: { $in: userIds } }, { uid: 1, name: 1, profilePic: 1 });

    // Create a lookup map for user details
    const userMap = new Map(users.map((user) => [user.uid, { name: user.name, profilePic: user.profilePic }]));

    // Construct base URL for serving media
    const baseURL = `${req.protocol}://${req.get("host")}`;

    // Transform posts data
    const updatedPosts = posts.map((post) => {
      const fullMedia = post.media.map((mediaPath) => `${baseURL}${mediaPath}`);

      const userData = userMap.get(post.userId) || {};
      const userName = userData.name || "Unknown User";
      const userProfilePic = userData.profilePic || "";

      const fullProfilePic = userProfilePic.startsWith("http")
        ? userProfilePic
        : userProfilePic
        ? `${baseURL}${userProfilePic}`
        : "";

      return {
        ...post.toObject(),
        media: fullMedia,
        url: `${baseURL}/posts/${post._id}`,
        profilePic: fullProfilePic,
        name: userName, // **Latest user name from the User table**
      };
    });

    res.status(200).json(updatedPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
};

//Incrementing Like's for posts
const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.uid; // Extract user ID from the request

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex === -1) {
      // If not liked, add userId to likes array
      post.likes.push(userId);
    } else {
      // If already liked, remove userId from likes array (unlike)
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    res.status(200).json({ message: "Like status updated", likesCount: post.likes.length });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Error toggling like", error: error.message });
  }
};


// Get a single post by ID
const getPost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postHtml = `
      <html>
        <head><title>${post.title}</title></head>
        <body>
          <h1>${post.title}</h1>
          <p>${post.description}</p>
          ${post.media
            .map((mediaPath) =>
              mediaPath.endsWith(".mp4")
                ? `<video src="${req.protocol}://${req.get("host")}${mediaPath}" controls></video>`
                : `<img src="${req.protocol}://${req.get("host")}${mediaPath}" alt="media" />`
            )
            .join("")}
        </body>
      </html>
    `;
    res.status(200).send(postHtml);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).send("Error fetching post");
  }
};

// Delete a post
const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ensure the authenticated user owns the post
    if (post.userId !== req.user.uid) {
      return res.status(403).json({ message: "You are not authorized to delete this post." });
    }

    // Delete associated media files
    deleteFiles(post.media);

    // Delete the post from MongoDB
    await Post.findByIdAndDelete(id);

    res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Error deleting post", error: error.message });
  }
};


// Update a post
const updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  console.log("Updating post");

  try {
    // Find the post by ID
    const post = await Post.findById(id);

    if (!post) {
      // Post not found
      return res.status(404).json({ message: "Post not found" });
    }

    // Ensure the authenticated user owns the post
    if (post.userId !== req.user.uid) {
      // Unauthorized access
      return res.status(403).json({ message: "You are not authorized to update this post." });
    }

    // Validate the title and description before updating
    if (title) {
      post.title = title; // Update the title only if provided
    }
    if (description !== undefined) { // Check if description is provided, even if it's an empty string
      post.description = description; // Update the description
    }

    // Ensure the username is not empty and is passed along with the update
    // If the username is not provided, retain the original username
    post.username = post.username || req.user.name || req.user.email;

    // Save the updated post
    await post.save();

    // Respond with the updated post
    res.status(200).json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Error updating post", error: error.message });
  }
};




module.exports = { createPost, getPosts, getPost, deletePost, updatePost,toggleLike, upload };

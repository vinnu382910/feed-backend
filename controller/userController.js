const User = require("../models/user");
const Post = require("../models/post");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { verifyToken } = require("../config/firebaseConfig");

// Utility to ensure the upload directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Define upload directory for media
const uploadDir = path.join(__dirname, "../uploads/post-media");
ensureDirectoryExists(uploadDir);

// Multer configuration for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const uniqueName = `media-${Date.now()}-${sanitizedFileName}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
}).fields([
  { name: "profilePic", maxCount: 1 },
  { name: "bannerImage", maxCount: 1 },
]);

// Utility to delete old images
const deleteOldImage = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file: ${filePath}`, err);
    });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    let user = await User.findOne({ uid: userId });
    if (!user) {
      const firebaseUser = await getAuth().getUser(userId);

      if (!firebaseUser) {
        return res.status(404).json({ message: "User not found" });
      }

      user = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email,
        email: firebaseUser.email,
        profilePic: firebaseUser.photoURL || "",
        bio: "",
        bannerImage: "",
      };

      await User.create(user);
    }

    const baseURL = `${req.protocol}://${req.get("host")}`;
    user.profilePic = user.profilePic
      ? user.profilePic.startsWith("http")
        ? user.profilePic
        : `${baseURL}${user.profilePic}`
      : "";
    user.bannerImage = user.bannerImage
      ? user.bannerImage.startsWith("http")
        ? user.bannerImage
        : `${baseURL}${user.bannerImage}`
      : "";

    const userPosts = await Post.find({ userId }).sort({ timestamp: -1 });
    const updatedPosts = userPosts.map((post) => ({
      ...post.toObject(),
      media: post.media.map((mediaPath) =>
        mediaPath.startsWith("http") ? mediaPath : `${baseURL}${mediaPath}`
      ),
      url: `${baseURL}/posts/${post._id}`,
    }));

    res.status(200).json({ user, posts: updatedPosts });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile", error: error.message });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Parse form-data using multer
    upload(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "Error uploading files", error: err.message });
      }

      const { name, bio } = req.body;

      // Fetch old user data
      const existingUser = await User.findOne({ uid: userId });

      // Paths for uploaded files
      const profilePicFile = req.files?.profilePic?.[0]?.path;
      const bannerImageFile = req.files?.bannerImage?.[0]?.path;

      // Prepare update fields
      const updateFields = { name, bio };
      if (profilePicFile) {
        if (existingUser && existingUser.profilePic) {
          deleteOldImage(path.join(__dirname, `..${existingUser.profilePic}`));
        }
        updateFields.profilePic = `/uploads/post-media/${path.basename(profilePicFile)}`;
      }
      if (bannerImageFile) {
        if (existingUser && existingUser.bannerImage) {
          deleteOldImage(path.join(__dirname, `..${existingUser.bannerImage}`));
        }
        updateFields.bannerImage = `/uploads/post-media/${path.basename(bannerImageFile)}`;
      }

      // Update user in MongoDB
      const updatedUser = await User.findOneAndUpdate({ uid: userId }, updateFields, {
        new: true,
      });

      // Update profilePic in all posts by this user
      if (profilePicFile) {
        const updatedProfilePicPath = `/uploads/post-media/${path.basename(profilePicFile)}`;
        await Post.updateMany(
          { userId },
          { $set: { profilePic: updatedProfilePicPath } }
        );
      }

      const baseURL = `${req.protocol}://${req.get("host")}`;
      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          ...updatedUser.toObject(),
          profilePic: updatedUser.profilePic
            ? `${baseURL}${updatedUser.profilePic}`
            : "",
          bannerImage: updatedUser.bannerImage
            ? `${baseURL}${updatedUser.bannerImage}`
            : "",
        },
      });
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user; // Extracted from verified token (via middleware)

    // Check if user exists
    let user = await User.findOne({ uid });

    if (!user) {
      // Create new user
      user = new User({
        uid,
        name: name || "Anonymous",
        email,
        profilePic: picture || "",
        bannerImage: "",
        bio: "",
      });

      await user.save();
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Fetch logged-in user data
const getUserData = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};



module.exports = { getUserProfile, updateUserProfile, googleAuth, getUserData };

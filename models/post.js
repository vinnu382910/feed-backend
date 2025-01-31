const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // User ID (from Firebase auth)
    username: { type: String, required: true }, // Username of the user
    profilePic: { type: String, required: true }, // URL of user's profile picture
    title: { type: String, required: true }, // Post title
    description: { type: String }, // Post description
    media: [
      {
        type: String, // Stores the URL of each image/video
      },
    ], // Array of media URLs
    likes: [{ type: String }],
    timestamp: { type: Date, default: Date.now }, // Timestamp of when the post was created
  },
  { collection: "Posts" }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;

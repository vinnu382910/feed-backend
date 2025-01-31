const express = require("express");
const router = express.Router();
const { createPost, getPosts, getPost, deletePost,updatePost,toggleLike, upload } = require("../controller/postController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/posts", authMiddleware, upload.array("media", 10), createPost); // Correctly initialized `upload`
router.get("/posts", getPosts);
router.get("/posts/:id", getPost); // Add this route
router.put("/posts/:id",authMiddleware, updatePost); // Added update post route
router.put("/posts/:postId/like", authMiddleware, toggleLike);
router.delete("/posts/:id", authMiddleware, deletePost); // Delete a post


module.exports = router;

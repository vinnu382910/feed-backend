const express = require("express");
const router = express.Router();
const { getUserProfile, updateUserProfile, googleAuth, getUserData} = require("../controller/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const { verifyToken } = require("../config/firebaseConfig");

router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
// Google Sign-In Route (uses middleware to verify token)
router.post("/google", authMiddleware, googleAuth);

// Get logged-in user details (protected)
router.get("/me", authMiddleware, getUserData);

router.post('/logout', verifyToken, (req, res) => {
    // You can perform any additional backend tasks if needed (like clearing sessions)
    res.status(200).json({ message: "Logged out successfully" });
  });

module.exports = router;

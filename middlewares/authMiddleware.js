const { verifyToken } = require("../config/firebaseConfig");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token

  if (!token) {
    console.log("No token provided in request");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decodedToken = await verifyToken(token);
    console.log("Decoded Token:", decodedToken); // Debugging: Check token data
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddleware;

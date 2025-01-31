const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const postRoutes = require("./routes/postRoutes");
const profileRoute = require("./routes/profileRoute");

const app = express();
const PORT = process.env.PORT || 5000;;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// CORS Middleware - Allow requests from the frontend (adjust URL to match your frontend)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "https://feed-backend-5awv.onrender.com"], // Adjust this to your frontend's URL
    credentials: true, // Allow credentials (cookies, etc.)
    allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  })
);

// COOP and COEP Headers for Firebase Google Sign-In popup interaction
// Middleware to set COOP and COEP headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});


// Serve static files for uploaded images
const uploadDir = path.join(__dirname, "uploads/post-images");
app.use("/uploads/post-images", express.static(uploadDir));

// Routes
app.use("/api", profileRoute); // Auth routes
app.use("/api", profileRoute); // Profile routes
app.use("/api", postRoutes); // Post routes

// Error handling (global error handler)
app.use((err, req, res, next) => {
  res.status(500).json({ message: "Server Error", error: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

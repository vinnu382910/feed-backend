const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true }, // Firebase UID
    name: { type: String, required: true },
    email: { type: String, required: true },
    profilePic: { type: String, default: "" },
    bannerImage: { type: String, default: "" }, // New field for banner image
    bio: { type: String, default: "" },
  },
  { collection: "Users" }
);

module.exports = mongoose.model("User", userSchema);

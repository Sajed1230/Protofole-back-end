const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  appName: { type: String, required: true }, // renamed to match your form field
  applicationType: { type: String, required: true },
  description: { type: String, required: true },
  tools: { type: [String], default: [] }, // array of tools
  image: { type: String }, // store the filename or image URL
  projectLink: { type: String, required: false }, // 🌐 new field for project URL (optional for mobile apps)
  apkFile: { type: String }, // 📱 APK file URL for mobile apps
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Project", ProjectSchema);

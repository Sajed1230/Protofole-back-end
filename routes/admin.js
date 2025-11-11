const express = require("express");
const Router = express.Router();
const Project = require("../models/Project");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// =============================================
// 🔧 Cloudinary Configuration
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================================
// 📦 Multer Cloudinary Storage Setup
// =============================================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "projects", // Folder name on Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// =============================================
// 🧱 ROUTES
// =============================================

// Render add project page
Router.get("/addproject", (req, res) => {
  res.render("addProject");
});

// =============================================
// ➕ Add New Project (Uploads to Cloudinary)
// =============================================
Router.post("/add-project", upload.single("projectImage"), async (req, res) => {
  try {
    const { appName, appType, description, tools, projectLink } = req.body;

    // Parse tools safely
    let toolsArray = [];
    try {
      toolsArray = JSON.parse(tools);
    } catch {
      toolsArray = tools ? [tools] : [];
    }

    const newProject = new Project({
      appName,
      applicationType: appType,
      description,
      tools: toolsArray,
      projectLink,
      image: req.file ? req.file.path : null, // ✅ Cloudinary image URL
    });

    await newProject.save();

    console.log("✅ New project added:", newProject);
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error adding project:", err);
    res.status(500).send("Error adding project");
  }
});

// =============================================
// ❌ Delete Project (Removes from Cloudinary)
// =============================================
Router.post("/projects/delete/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (project && project.image) {
      // Extract public_id from URL to delete from Cloudinary
      const parts = project.image.split("/");
      const publicIdWithExt = parts.slice(-2).join("/"); // e.g., "projects/abc123.jpg"
      const publicId = publicIdWithExt.split(".")[0]; // remove file extension

      await cloudinary.uploader.destroy(publicId);
    }

    await Project.findByIdAndDelete(req.params.id);
    console.log("🗑️ Project deleted");
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.status(500).send("Error deleting project");
  }
});

// =============================================
// ✏️ Edit Project Form
// =============================================
Router.get("/projects/edit/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.render("editProject", { project });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching project");
  }
});

// =============================================
// ♻️ Update Project (Re-upload Image if Provided)
// =============================================
Router.post("/projects/edit/:id", upload.single("projectImage"), async (req, res) => {
  try {
    const { appName, appType, description, tools, projectLink } = req.body;
    let toolsArray = [];
    try {
      toolsArray = JSON.parse(tools);
    } catch {
      toolsArray = tools ? [tools] : [];
    }

    const updateData = {
      appName,
      applicationType: appType,
      description,
      tools: toolsArray,
      projectLink,
    };

    // If new image uploaded, replace old Cloudinary image
    if (req.file) {
      const project = await Project.findById(req.params.id);

      // Delete old image from Cloudinary
      if (project && project.image) {
        const parts = project.image.split("/");
        const publicIdWithExt = parts.slice(-2).join("/");
        const publicId = publicIdWithExt.split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      updateData.image = req.file.path; // new Cloudinary URL
    }

    await Project.findByIdAndUpdate(req.params.id, updateData);
    console.log("✅ Project updated successfully");
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error updating project:", err);
    res.status(500).send("Error updating project");
  }
});

// =============================================
module.exports = Router;

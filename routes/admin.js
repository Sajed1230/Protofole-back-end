const express = require("express");
const Router = express.Router();
const Project = require("../models/Project");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { Readable } = require("stream");

// =============================================
// 🔧 Cloudinary Configuration
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================================
// 📦 Multer Storage Setup
// =============================================
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "projects/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

// Memory storage for APK files (will upload to Cloudinary manually)
const apkMemoryStorage = multer.memoryStorage();

// Helper function to upload APK to Cloudinary
const uploadAPKToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'projects/apk',
        public_id: filename.replace(/\.apk$/i, ''),
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

// Custom storage that handles both image and APK using memory storage
const multiUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max (for APK files)
});

const upload = multer({ 
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB for images
});

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
Router.post("/add-project", multiUpload.fields([
  { name: 'projectImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { appName, appType, description, tools, projectLink } = req.body;

    // Parse tools safely
    let toolsArray = [];
    try {
      toolsArray = JSON.parse(tools);
    } catch {
      toolsArray = tools ? [tools] : [];
    }

    let imageUrl = null;

    // Handle image upload
    if (req.files && req.files.projectImage && req.files.projectImage[0]) {
      const imageFile = req.files.projectImage[0];
      try {
        const imageUpload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'projects/images',
              allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          const readableStream = new Readable();
          readableStream.push(imageFile.buffer);
          readableStream.push(null);
          readableStream.pipe(stream);
        });
        imageUrl = imageUpload.secure_url;
        console.log("✅ Image uploaded successfully:", imageUrl);
      } catch (imgErr) {
        console.error("⚠️ Error uploading image:", imgErr);
        console.error("Image upload error details:", imgErr.message);
      }
    }

    const newProject = new Project({
      appName,
      applicationType: appType,
      description,
      tools: toolsArray,
      projectLink,
      image: imageUrl,
    });

    await newProject.save();

    console.log("✅ New project added:", newProject);
    console.log("📷 Project image URL:", newProject.image);
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error adding project:", err);
    res.status(500).send("Error adding project: " + err.message);
  }
});

// =============================================
// ❌ Delete Project (Removes from Cloudinary)
// =============================================
Router.post("/projects/delete/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    // Delete image from Cloudinary
    if (project && project.image) {
      try {
        const parts = project.image.split("/");
        const publicIdWithExt = parts.slice(-2).join("/"); // e.g., "projects/abc123.jpg"
        const publicId = publicIdWithExt.split(".")[0]; // remove file extension
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.log("Note: Could not delete image from Cloudinary");
      }
    }

    // Delete APK from Cloudinary
    if (project && project.apkFile) {
      try {
        const parts = project.apkFile.split("/");
        const publicIdWithExt = parts.slice(-2).join("/");
        const publicId = publicIdWithExt.replace(/\.(apk|zip|bin)$/i, '');
        await cloudinary.uploader.destroy(`projects/apk/${publicId}`, { resource_type: 'raw' });
      } catch (err) {
        console.log("Note: Could not delete APK from Cloudinary");
      }
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
// ♻️ Update Project (Re-upload Image/APK if Provided)
// =============================================
Router.post("/projects/edit/:id", multiUpload.fields([
  { name: 'projectImage', maxCount: 1 },
  { name: 'apkFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { appName, appType, description, tools, projectLink } = req.body;
    let toolsArray = [];
    try {
      toolsArray = JSON.parse(tools);
    } catch {
      toolsArray = tools ? [tools] : [];
    }

    const project = await Project.findById(req.params.id);
    const updateData = {
      appName,
      applicationType: appType,
      description,
      tools: toolsArray,
      projectLink,
    };

    // If new image uploaded, replace old Cloudinary image
    if (req.files && req.files.projectImage && req.files.projectImage[0]) {
      const imageFile = req.files.projectImage[0];
      
      // Delete old image from Cloudinary
      if (project && project.image) {
        try {
          const parts = project.image.split("/");
          const publicIdWithExt = parts.slice(-2).join("/");
          const publicId = publicIdWithExt.split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log("Note: Could not delete old image");
        }
      }
      
      // Upload new image
      try {
        const imageUpload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'projects/images',
              allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          const readableStream = new Readable();
          readableStream.push(imageFile.buffer);
          readableStream.push(null);
          readableStream.pipe(stream);
        });
        updateData.image = imageUpload.secure_url;
        console.log("✅ Image updated successfully:", updateData.image);
      } catch (err) {
        console.error("Error uploading image:", err);
        console.error("Image update error details:", err.message);
      }
    }

    // If new APK uploaded, replace old APK file
    if (req.files && req.files.apkFile && req.files.apkFile[0]) {
      const apkFile = req.files.apkFile[0];
      
      // Delete old APK from Cloudinary if exists
      if (project && project.apkFile) {
        try {
          const parts = project.apkFile.split("/");
          const publicIdWithExt = parts.slice(-2).join("/");
          const publicId = publicIdWithExt.replace(/\.(apk|zip|bin)$/i, '');
          await cloudinary.uploader.destroy(`projects/apk/${publicId}`, { resource_type: 'raw' });
        } catch (err) {
          console.log("Note: Could not delete old APK");
        }
      }
      
      // Upload new APK
      try {
        const fileSizeMB = (apkFile.size / (1024 * 1024)).toFixed(2);
        console.log(`📱 Updating APK file: ${apkFile.originalname} (${fileSizeMB} MB)`);
        
        // Add timeout for large files (5 minutes)
        const uploadPromise = uploadAPKToCloudinary(apkFile.buffer, apkFile.originalname);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('APK upload timeout. File may be too large.')), 300000)
        );
        
        const apkUpload = await Promise.race([uploadPromise, timeoutPromise]);
        updateData.apkFile = apkUpload.secure_url;
        console.log("✅ APK updated successfully:", updateData.apkFile);
      } catch (err) {
        console.error("Error uploading APK:", err);
        console.error("APK update error details:", err.message);
      }
    }

    await Project.findByIdAndUpdate(req.params.id, updateData);
    console.log("✅ Project updated successfully");
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error updating project:", err);
    res.status(500).send("Error updating project: " + err.message);
  }
});

// =============================================
module.exports = Router;

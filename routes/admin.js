const express = require("express");
const Router = express.Router();
const upload = require("../middleware/upload"); // your multer setup
const Project = require("../models/Project");

// Render add project page
Router.get("/addproject", (req, res) => {
  res.render("addProject");
});

// Handle form submission
Router.post("/add-project", upload.single("projectImage"), async (req, res) => {
  try {
    const { appName, appType, description, tools, projectLink } = req.body;

    // Parse tools array safely
    let toolsArray = [];
    try {
      toolsArray = JSON.parse(tools);
    } catch {
      toolsArray = tools ? [tools] : [];
    }

    // Create a new project document
    const newProject = new Project({
      appName,
      applicationType: appType,
      description,
      tools: toolsArray,
      projectLink, // 🌐 Save the new project link
      image: req.file ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` : null,

    });

    await newProject.save();

    console.log("✅ New project added:", newProject);
    res.redirect("/shop/projects");
  } catch (err) {
    console.error("❌ Error adding project:", err);
    res.status(500).send("Error adding project");
  }
});

///////////////////////////////////////////////////////

Router.post("/projects/delete/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project.image) {
      // remove image from local storage
      const fs = require("fs");
      const path = require("path");
      const imgPath = path.join(__dirname, "../public/uploads", project.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Project.findByIdAndDelete(req.params.id);
    res.redirect("/shop/projects");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error deleting project");
  }
});

/////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

Router.post("/projects/delete/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project.image) {
      // remove image from local storage
      const fs = require("fs");
      const path = require("path");
      const imgPath = path.join(__dirname, "../public/uploads", project.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Project.findByIdAndDelete(req.params.id);
    res.redirect("/admin/projects");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error deleting project");
  }
});

// Edit project form
Router.get("/projects/edit/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.render("editProject", { project });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching project");
  }
});

// Update project
Router.post("/projects/edit/:id", upload.single("projectImage"), async (req, res) => {
  try {
    const { appName, appType, description, tools } = req.body;
    let toolsArray = [];
    try { toolsArray = JSON.parse(tools); } catch { toolsArray = tools ? [tools] : []; }

    const updateData = {
      name: appName,
      applicationType: appType,
      description,
      tools: toolsArray,
    };

    if (req.file) updateData.image = req.file.filename;

    await Project.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/shop/projects");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error updating project");
  }
});
///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

module.exports = Router;

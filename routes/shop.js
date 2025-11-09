const express=require('express');
const Project = require('../models/Project');
const Router=express.Router()

Router.get("/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // latest first
    res.render("projects", { projects }); // render EJS page
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching projects");
  }
});

module.exports=Router
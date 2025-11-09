const express=require('express');
const Project = require('../models/Project');
const Router=express.Router()

Router.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects); // send data as JSON
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Error fetching projects" });
  }
});

module.exports=Router
const express=require('express');
const nodemailer=require('nodemailer');
const Project = require('../models/Project');
const { contactLimiter, validateContactInput } = require('../middleware/security');
const Router=express.Router()

// Protected route: Get all projects
Router.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects); // send data as JSON
    
  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    res.status(500).json({ error: "❌ Error fetching projects" });
  }
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Protected route: Contact form with rate limiting and validation
Router.post("/contact", contactLimiter, validateContactInput, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER,
      subject: `📩 New message from ${name}: ${subject}`,
      text: `
You have received a new contact form message:

👤 Name: ${name}
📧 Email: ${email}
📝 Subject: ${subject}
💬 Message: ${message}
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    console.error(error); // full stack trace
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});






module.exports=Router
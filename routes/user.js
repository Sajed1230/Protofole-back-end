const express=require('express');

const nodemailer=require('nodemailer');

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

//....................................
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
//....................................
Router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Email content sent to you
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER, // your inbox
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
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
});





module.exports=Router
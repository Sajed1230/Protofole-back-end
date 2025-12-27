require("dotenv").config(); // Load .env variables
const express = require("express");
const connectDB = require("./db"); // We'll create this file
const path = require("path");
const app = express();
const cors = require('cors');
const { securityHeaders, apiLimiter } = require("./middleware/security");

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

connectDB();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public"))); // serve public folder

const adminRouter = require("./routes/admin");
const projectRouter = require("./routes/shop");
const userRouter = require("./routes/user");

app.set("view engine", "ejs");
app.set("views","views");

// Apply rate limiting to API routes
app.use("/user", apiLimiter);

// Routes
app.use("/admin", adminRouter);
app.use("/shop", projectRouter);
app.use("/user", userRouter);


// Home route example
app.get("/", (req, res) => {
  res.send("Welcome to Portfolio App!");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

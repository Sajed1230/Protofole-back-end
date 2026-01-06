const rateLimit = require('express-rate-limit');

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 contact form submissions per windowMs
  message: 'Too many contact form submissions, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const validateContactInput = (req, res, next) => {
  const { name, email, subject, message } = req.body;

  // Check if required fields exist
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate input lengths
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name is too long (max 100 characters)' });
  }

  if (subject.length > 200) {
    return res.status(400).json({ error: 'Subject is too long (max 200 characters)' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
  }

  // Sanitize inputs (basic)
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.subject = subject.trim();
  req.body.message = message.trim();

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  next();
};

module.exports = {
  apiLimiter,
  contactLimiter,
  validateContactInput,
  securityHeaders,
};







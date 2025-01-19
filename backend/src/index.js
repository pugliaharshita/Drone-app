require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const docusignRoutes = require('./routes/docusign');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'https://drone-registration.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/docusign', docusignRoutes);

// Add a health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export the serverless function
module.exports.handler = serverless(app); 
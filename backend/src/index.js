require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const docusignRoutes = require('./routes/docusign');

const app = express();

// Basic middleware
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

// Create the serverless handler
const handler = serverless(app);

// Wrap the handler to add CORS headers
module.exports.handler = async (event, context) => {
  // Log the incoming request
  console.log('Incoming request:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers
  });

  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    };
  }

  try {
    // Process the request through Express
    const response = await handler(event, context);

    // Add CORS headers to the response
    return {
      ...response,
      headers: {
        ...response.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      }
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return error response with CORS headers
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}; 
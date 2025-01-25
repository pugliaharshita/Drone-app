import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as oauthRoutes } from './routes/oauth';
import { validateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// OAuth routes
app.use('/oauth', oauthRoutes);

// Protected route example
app.get('/api/protected', validateToken, (req, res) => {
  res.json({ message: 'Access granted to protected resource' });
});

app.listen(PORT, () => {
  console.log(`Extension server running on port ${PORT}`);
}); 
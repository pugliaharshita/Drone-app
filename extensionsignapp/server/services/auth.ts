import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (clientId: string): string => {
  return jwt.sign({ clientId }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

export const verifyClientCredentials = async (
  clientId: string,
  clientSecret: string,
  clients: { [key: string]: { clientSecret: string, name: string } }
): Promise<boolean> => {
  const client = clients[clientId];
  if (!client) return false;
  return client.clientSecret === clientSecret;
}; 
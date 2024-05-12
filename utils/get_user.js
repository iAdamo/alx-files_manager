import { ObjectId } from 'mongodb';
import dbClient from './db';
import redisClient from './redis';

export default async function getUserByToken(req, res) {
  // Obtain the token from the header
  const token = req.headers['x-token'];
  if (!token) {
    res.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  // Check if the token is valid
  const value = await redisClient.get(`auth_${token}`);
  if (!value) {
    res.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  // Fetch the user from the database
  const user = await dbClient.getUserBy({ _id: ObjectId(value) });
  if (!user) {
    res.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  // Return the user's ID
  return user._id;
}

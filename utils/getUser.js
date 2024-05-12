import { ObjectId } from 'mongodb';
import dbClient from './db';
import redisClient from './redis';

export default async function getUserByToken(req) {
  // Obtain the token from the header
  const token = req.headers['x-token'];
  if (!token) return null;

  // Check if the token is valid
  const value = await redisClient.get(`auth_${token}`);
  if (!value) return null;

  // Fetch the user from the database
  const user = await dbClient.getUserBy({ _id: ObjectId(value) });
  if (!user) return null;

  // Return the user's ID
  return user._id;
}

import { createHash } from 'crypto';
import { v4 } from 'uuid';

import dbClient from '../utils/db';
import getUserByToken from '../utils/getUser';
import redisClient from '../utils/redis';

export default class AuthController {
  // Sign-in a user by generating a new authentication token
  static async getConnect(req, res) {
    // Obtain the Authorization header
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Decode the Base64 credentials
    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('utf-8');

    // Extract the email and password from the credentials
    const [email, password] = credentials.split(':');

    // Check if the email and password are valid
    const user = await dbClient.getUserBy({ email });
    const hashedPassword = createHash('sha1').update(password).digest('hex');

    // Compare the hashed password with the password stored in the database
    if (!user || user.password !== hashedPassword) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Generate a new authentication token with uuidv4
    const token = v4();

    // Store the token in redis with an expiration of 24 hours
    const key = `auth_${token}`;
    const value = user._id.toString();
    await redisClient.set(key, value, 86400);

    // Set the token in the response header and return it in a JSON response
    res.set('X-Token', token);
    res.status(200).send({ token });
  }

  // sign-out a user based on a token
  static async getDisconnect(req, res) {
    // Obtain the Authorization token from the header
    const token = req.headers['x-token'];
    const userId = await getUserByToken(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Delete the token from redis
    await redisClient.del(`auth_${token}`);
    res.status(204).end();
  }
}

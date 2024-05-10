import { ObjectId } from 'mongodb';

import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UsersController {
  // Retrieve the user based on the token
  static async getMe(req, res) {
    // Obtain the token from the header
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Check if the token is valid
    const value = await redisClient.get(`auth_${token}`);
    if (!value) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch the user from the database
    const user = await dbClient.getUserBy({ _id: ObjectId(value) });
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Return the user information in a JSON response
    res.status(200).send({ id: user._id, email: user.email });
  }
}

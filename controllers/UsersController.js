import { createHash } from 'crypto';

import dbClient from '../utils/db';
import getUserByToken from '../utils/getUser';

export default class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).send({ error: 'Missing email' });
      if (!password) return res.status(400).send({ error: 'Missing password' });

      const user = await dbClient.db.collection('users').findOne({ email });
      if (user) return res.status(400).send({ error: 'Already exist' });

      const hashedPassword = createHash('sha1').update(password).digest('hex');
      const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
      return res.status(201).send({ id: result.insertedId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Retrieve the user based on the token
  static async getMe(req, res) {
    // Authenticate user by token
    const userId = await getUserByToken(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch the user from the database
    const user = await dbClient.getUserBy({ _id: userId });
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Return the user information in a JSON response
    res.status(200).send({ id: user._id, email: user.email });
  }
}

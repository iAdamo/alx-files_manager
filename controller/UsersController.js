import { createHash } from 'crypto';
import DBClient from '../utils/db';

export default class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).send({ error: 'Missing email' });
      if (!password) return res.status(400).send({ error: 'Missing password' });

      const user = await DBClient.db.collection('users').findOne({ email });
      if (user) return res.status(400).send({ error: 'Already exist' });

      const hashedPassword = createHash('sha1').update(password).digest('hex');
      const result = await DBClient.db.collection('users').insertOne({ email, password: hashedPassword });
      return res.status(201).send({ id: result.insertedId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

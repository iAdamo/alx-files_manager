import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Handles application requests.
 */
export default class AppController {
  /**
   * Checks the status of the API.
   *
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  static getStatus(req, res) {
    res.status(200).send({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(req, res) {
    /**
     * Retrieves the number of users and files in the database.
     */
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).send({ users, files });
  }
}

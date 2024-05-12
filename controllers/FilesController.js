import { ObjectId } from 'mongodb';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import dbClient from '../utils/db';
import getUserByToken from '../utils/get_user';

const defaultFolderPath = '/tmp/files_manager';

/**
 * Handles file upload requests.
 */
export default class FilesController {
  /**
   * Processes a POST request for file upload.
   *
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  static async postUpload(req, res) {
    try {
      // Retrieve user ID from token
      const userId = await getUserByToken(req, res);
      if (!userId) {
        res.status(400).send({ error: 'Missing or invalid token' });
        return;
      }

      // Get file information and validate
      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      if (!name) {
        res.status(400).send({ error: 'Missing name' });
        return;
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        res.status(400).send({ error: 'Missing or invalid type' });
        return;
      }
      if (!data && type !== 'folder') {
        res.status(400).send({ error: 'Missing data for non-folder files' });
        return;
      }

      // Validate parent file if provided
      if (parentId !== 0) {
        const parentFile = await dbClient.getFileBy({ _id: ObjectId(parentId) });
        if (!parentFile) {
          res.status(400).send({ error: 'Parent file not found' });
          return;
        }
        if (parentFile.type !== 'folder') {
          res.status(400).send({ error: 'Parent must be a folder' });
          return;
        }
      }

      // Create folder in database
      if (type === 'folder') {
        const newFolder = {
          userId: ObjectId(userId),
          name,
          type,
          isPublic,
          parentId: parentId === 0 ? 0 : ObjectId(parentId),
        };
        const folder = await dbClient.createFile({ ...newFolder });
        res.status(201).send({ id: folder.insertedId, ...newFolder });
        return;
      }

      // Handle file upload (file or image)
      const folderPath = process.env.FOLDER_PATH || defaultFolderPath;
      const fileUUID = uuidv4();
      const localPath = path.join(folderPath, fileUUID);
      fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, data, 'base64');

      // Create file record in database
      const file = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
        localPath,
      };
      const newFile = await dbClient.createFile({ ...file });
      res.status(201).send({
        id: newFile.insertedId, userId, name, type, isPublic, parentId,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).send({ error: 'Server error' });
    }
  }
}

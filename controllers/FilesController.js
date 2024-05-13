import path from 'path';
import { promises as fs } from 'fs';
import { v4 } from 'uuid';

import mime from 'mime-types';
import { ObjectId } from 'mongodb';

import dbClient from '../utils/db';
import getUserByToken from '../utils/getUser';

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
      const fileUUID = v4();
      const localPath = path.join(folderPath, fileUUID);
      fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, data, 'base64');

      // Create file record in database
      const newFile = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
      };
      const file = await dbClient.createFile({ ...newFile, localPath });
      res.status(201).send({ id: file.insertedId, ...newFile });
    } catch (err) {
      res.status(500).send({ error: `postUpload Error ${err}` });
    }
  }

  /**
   * Processes a GET request for a file by ID.
   *
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  static async getShow(req, res) {
    // Retrieve the user based on the token and validate
    try {
      const userId = await getUserByToken(req);
      if (!userId) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }
      // Get file id from request body
      const fileId = req.params.id;
      const file = await dbClient.getFileBy({ _id: ObjectId(fileId), userId });
      if (!file || file.userId.toString() !== userId.toString()) {
        res.status(404).send({ error: 'Not found' });
        return;
      }
      // Rename _id and remove localPath for better json response
      const { _id, localPath, ...rest } = file;
      res.status(200).send({ id: _id, ...rest });
    } catch (err) {
      res.status(500).send({ error: `getShow Error ${err}` });
    }
  }

  /**
   * Processes a GET request for files.
   *
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  static async getIndex(req, res) {
    try {
      // Retrieve the user based on the token and validate
      const userId = await getUserByToken(req);
      if (!userId) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      // Get query parameters
      const parentId = req.query.parentId ? ObjectId(req.query.parentId) : 0;
      const page = req.query.page || 0;

      // Get files from database based on pagination
      const filesCollection = dbClient.db.collection('files');
      let dbQuery;
      if (parentId) {
        dbQuery = { parentId, userId };
      } else {
        dbQuery = { userId };
      }

      const files = await filesCollection.aggregate([
        { $match: dbQuery },
        { $skip: page * 20 },
        { $limit: 20 },
        { $project: { localPath: 0 } },
      ]).toArray();

      if (!files) {
        res.status(200).send([]);
        return;
      }
      res.status(200).send(files);
    } catch (err) {
      res.status(500).send({ error: `getIndex Error ${err}` });
    }
  }

  /**
 * Make a file public.
 * PUT /files/:id/publish
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
  static async putPublish(req, res) {
    try {
      const userId = await getUserByToken(req);
      if (!userId) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      // Get the file from the database
      const fileId = req.params.id;
      const file = await dbClient.getFileBy({ _id: ObjectId(fileId), userId });
      if (!file) {
        res.status(404).send({ error: 'Not found' });
        return;
      }

      // Update the file to be public
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId), userId }, { $set: { isPublic: true } });
      // Reformat the json response
      const {
        _id, name, type, parentId,
      } = file;
      res.status(200).send({
        id: _id, userId, name, type, isPublic: true, parentId,
      });
    } catch (err) {
      res.status(500).send({ error: `putPublish Error ${err}` });
    }
  }

  /**
 * Make a file private.
 * PUT /files/:id/unpublish
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
  static async putUnpublish(req, res) {
    try {
      const userId = await getUserByToken(req);
      if (!userId) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      // Get the file from the database
      const fileId = req.params.id;
      const file = await dbClient.getFileBy({ _id: ObjectId(fileId), userId });
      if (!file) {
        res.status(404).send({ error: 'Not found' });
        return;
      }

      // Update the file to be private
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId), userId }, { $set: { isPublic: false } });

      // Reformat the json response
      const {
        _id, name, type, parentId,
      } = file;
      res.status(200).send({
        id: _id, userId, name, type, isPublic: false, parentId,
      });
    } catch (err) {
      res.status(500).send({ error: `putUnpublish Error ${err}` });
    }
  }

  /**
 * Get the data content of a file.
 * GET /files/:id/data
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
  static async getFile(req, res) {
    // Get the file from the database
    const fileId = req.params.id;
    const file = await dbClient.getFileBy({ _id: ObjectId(fileId) });
    if (!file) {
      res.status(404).send({ error: 'Not found' });
      return;
    }

    // Obtain the user ID by the token
    const authUserId = await getUserByToken(req);

    // Get userId and isPublic attributes
    const { userId, isPublic } = file;

    // Consider when the file is not public and the user is not the owner
    if (!isPublic && (!authUserId || authUserId.toString() !== userId.toString())) {
      res.status(403).send({ error: 'Not found' });
      return;
    }

    // Check if the file is not a folder
    if (file.type === 'folder') {
      res.status(400).send({ error: "A folder doesn't have content" });
      return;
    }

    // Check local availability of the file
    const { localPath } = file;
    try {
      await fs.stat(localPath);
    } catch (err) {
      res.status(404).send({ error: 'Not found' });
      return;
    }

    // Get the MIME-type of the file
    const mimeType = mime.lookup(file.name);

    // Read the file
    const fileContent = await fs.readFile(localPath, 'utf-8');
    if (fileContent) {
      // Set the 'Content-Type' header to the MIME type of the file
      res.set('Content-Type', mimeType);

      // Send the file content
      res.status(200).send(fileContent);
    }
  }
}

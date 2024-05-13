import path from 'path';
import fs from 'fs/promises';
import { v4 } from 'uuid';
import Queue from 'bull';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';

import dbClient from '../utils/db';
import getUserByToken from '../utils/getUser';

const defaultFolderPath = '/tmp/files_manager';
const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379'); // Create a Bull queue

/**
 * Handles file upload requests.
 */
export default class FilesController {
/**
 * Handles file upload requests.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
  static async postUpload(req, res) {
    // Validate user login
    const userId = await getUserByToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Obtain file information from request body and validate
    const { name, type, data } = req.body;
    const parentId = req.body.parentId || '0';
    const isPublic = req.body.isPublic || false;

    // Validate request data
    if (!name || !type || (type !== 'folder' && !data)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Check if parent file exists in database
    if (parentId !== '0') {
      const parentFile = await dbClient.getFileBy({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create file in database
    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === '0' ? '0' : ObjectId(parentId),
    };

    if (type === 'folder') {
      const folder = await dbClient.createFile({ ...newFile });
      return res.status(201).json({ id: folder.insertedId, ...newFile });
    }

    // If type is not 'folder', write the file to the filesystem
    const fileFolder = process.env.FOLDER_PATH || defaultFolderPath;
    const localPath = path.join(fileFolder, v4());
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, data, 'base64');

    // Add new file document in the collection files
    const file = await dbClient.createFile({ ...newFile, localPath });

    // Add the file to the queue if file type is image
    if (type === 'image') {
      fileQueue.add({ fileId: file.insertedId, userId });
    }

    return res.status(201).json({ id: file.insertedId, ...newFile });
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
    // Check if the file is not a folder
    if (file.type === 'folder') {
      res.status(400).send({ error: "A folder doesn't have content" });
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

    // Get the file path
    let { localPath } = file;
    // Check if the file is an image
    if (file.type === 'image') {
      // Get file size from the request query
      let { size } = req.query;
      if (!size) size = 500;
      localPath = `${localPath}_${size}`;
    }
    // Check file local availability
    try {
      await fs.stat(localPath);
    } catch (err) {
      res.status(404).send({ error: 'Not found' });
    }

    // Get the MIME-type of the file
    const mimeType = mime.lookup(file.name);

    // Set the 'Content-Type' header to the MIME type of the file
    res.setHeader('Content-Type', mimeType);
    //console.log(localPath);
    // Send the file from the disk
    res.status(200).sendFile(localPath);
  }
}

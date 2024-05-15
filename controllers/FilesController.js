import path from 'path';
import { promises as fs } from 'fs';
import { v4 } from 'uuid';

import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import Queue from 'bull';

import dbClient from '../utils/db';
import getUserByToken from '../utils/getUser';

export default class FilesController {
  // POST /files - Upload a file callback
  static async postUpload(req, res) {
    // Create a Bull queue
    const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

    // Validate user login
    const userId = await getUserByToken(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Obtain file information from request body and validate
    const { name, type, data } = req.body;
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;

    if (!name) {
      res.status(400).send({ error: 'Missing name' });
      return;
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      res.status(400).send({ error: 'Missing type' });
      return;
    }
    if (!data && type !== 'folder') {
      res.status(400).send({ error: 'Missing data' });
      return;
    }
    if (parentId !== 0) {
      // Check if parent file exists in database
      const parentFile = await dbClient.getFileBy({ _id: ObjectId(parentId) });
      if (!parentFile) {
        res.status(400).send({ error: 'Parent not found' });
        return;
      }
      if (parentFile.type !== 'folder') {
        res.status(400).send({ error: 'Parent is not a folder' });
        return;
      }
    }

    // Create file in database
    if (type === 'folder') {
      const newFolder = {
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
      };
      const folder = await dbClient.createFile({ ...newFolder });
      res.status(201).send({ id: folder.insertedId, ...newFolder });
    } else {
      const fileFolder = process.env.FOLDER_PATH || '/tmp/files_manager';

      // Make the full pathname
      const localPath = path.join(fileFolder, v4());

      // Write the data to the full pathname
      fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, data, 'base64');

      // Add new file document in the collection files
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
      };
      const file = await dbClient.createFile({ ...newFile, localPath });

      // Add the file to the queue if file type is image
      if (type === 'image') fileQueue.add({ fileId: file.insertedId, userId });

      res.status(201).send({ id: file.insertedId, ...newFile });
    }
  }

  // GET /files/:id - Get a file by id callback
  static async getShow(req, res) {
    // Retrieve the user based on the token and validate
    const userId = await getUserByToken(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    // Get file id from request body
    const fileId = req.params.id;
    const file = await dbClient.getFileBy({ _id: ObjectId(fileId), userId });
    if (!file) {
      res.status(404).send({ error: 'Not found' });
      return;
    }
    // Rename _id and remove localPath for better json response
    const { _id, localPath, ...rest } = file;
    res.status(200).send({ id: _id, ...rest });
  }

  // GET /files - Get files callback
  static async getIndex(req, res) {
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
    ]).toArray();

    if (!files) {
      res.status(200).send([]);
      return;
    }
    // Rename _id and remove localPath for better json response
    const cleanedFiles = files.map(({ _id, localPath, ...file }) => ({ id: _id, ...file }));
    res.status(200).send(cleanedFiles);
  }

  // PUT /files/:id/publish - Make a file public callback
  static async putPublish(req, res) {
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
      id: _id,
      userId,
      name,
      type,
      isPublic: true,
      parentId,
    });
  }

  // PUT /files/:id/unpublish - Make a file private callback
  static async putUnpublish(req, res) {
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
      id: _id,
      userId,
      name,
      type,
      isPublic: false,
      parentId,
    });
  }

  // GET /files/:id/data - Data content callback
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
    if (!isPublic && (authUserId.toString() !== userId.toString())) {
      res.status(403).send({ error: 'Not found' });
      return;
    }

    // Check if the file is not a folder
    if (file.type === 'folder') {
      res.status(400).send({ error: "A folder doesn't have content" });
      return;
    }

    // Get the file path
    let { localPath } = file;
    // Check if the file is an image
    if (file.type === 'image') {
      // Get file size from the request query
      const { size } = req.query;
      if (size) localPath = `${localPath}_${size}`;
    }
    // Check file local availability
    try {
      await fs.stat(localPath);
    } catch (err) {
      res.status(404).send({ error: 'Not found' });
      return;
    }

    // Get the MIME-type of the file
    const mimeType = mime.lookup(file.name);

    // Set the 'Content-Type' header to the MIME type of the file
    res.set('Content-Type', mimeType);

    // Send the file from the disk
    res.status(200).sendFile(localPath);
  }
}

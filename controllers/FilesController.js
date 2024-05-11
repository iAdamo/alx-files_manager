import { ObjectId } from 'mongodb';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 } from 'uuid';

import auth from '../utils/auth';
import dbClient from '../utils/db';

export default class FilesController {
  static async postUpload(req, res) {
    // Validate user login
    const userId = await auth(req);
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
        userId: ObjectId(userId),
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
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
      };
      const file = await dbClient.createFile({ ...newFile, localPath });
      res.status(201).send({ id: file.insertedId, ...newFile });
    }
  }

  static async getShow(req, res) {
    // Retrieve the user based on the token and validate
    const userId = await auth(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    // Get file id from request body
    const fileId = req.params.id;
    const file = await dbClient.getFileBy({ _id: ObjectId(fileId) });
    if (!file) {
      res.status(404).send({ error: 'Not found' });
      return;
    }
    // Rename _id and remove localPath for better json response
    const cleanedFiles = file.map(({ _id, localPath, ...file }) => ({ id: _id, ...file }));
    res.status(200).send(cleanedFiles);
  }

  static async getIndex(req, res) {
    // Retrieve the user based on the token and validate
    const userId = await auth(req);
    if (!userId) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    console.log('userId', userId);
    // Get query parameters
    const parentId = req.query.parentId ? ObjectId(req.query.parentId) : 0;
    const page = req.query.page || 0;

    // Get files from database based on pagination
    const files = await dbClient.db.collection('files').aggregate([
      { $match: { parentId } },
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
}

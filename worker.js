import { promises as fs } from 'fs';

import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import Queue from 'bull';

import dbClient from './utils/db';

// Create a bull queue
const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

// Process fileQueue job
fileQueue.process(async (job, done) => {
  // Get job data
  const { fileId, userId } = job.data;
  if (!fileId) done(new Error('Missing fileId'));
  if (!userId) done(new Error('Missing userId'));

  // Check the file existence
  const file = await dbClient.getFileBy({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) done(new Error('File not found'));

  // Generate the thumbnail
  const imageSizes = [500, 250, 100];
  imageSizes.forEach(async (size) => {
    try {
      const options = { width: size };
      // Generate the thumbnail
      const thumbnail = await imageThumbnail(file.localPath, options);
      const thumbnailPath = `${file.localPath}_${size}`;

      // Write the thumbnail to disk
      await fs.writeFile(thumbnailPath, thumbnail);
    } catch (error) {
      console.log(error);
    }
  });
  done();
});

// Process the userQueue job
userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error('Missing userId'));

  const user = await dbClient.getUserBy({ _id: ObjectId(userId) });
  if (!user) done(new Error('User not found'));

  console.log(`Welcome ${user.email}`);
  done();
});

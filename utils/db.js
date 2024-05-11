import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    // Connect to MongoDB
    const url = `mongodb://${this.host}:${this.port}`;
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        this.db = client.db(this.database);
      } else {
        console.error(`Error connecting to MongoDB: ${err}`);
      }
    });
  }

  // Check if the connection to MongoDB is established
  isAlive() {
    return !!this.db;
  }

  // Fetch a user from the collection users
  async getUserBy(attributes) {
    const usersCollection = this.db.collection('users');
    const user = await usersCollection.findOne(attributes);
    return user;
  }

  // Fetch all users
  async getUsers() {
    const usersCollection = this.db.collection('users');
    const users = await usersCollection.find();
    return users;
  }

  // Get a file from the files collection
  async getFileBy(attributes) {
    const filesCollection = this.db.collection('files');
    const file = await filesCollection.findOne(attributes);
    return file;
  }

  // Get all files from the files collection
  async getFiles() {
    const filesCollection = this.db.collection('files');
    const files = await filesCollection.find();
    return files;
  }

  // Store a user in the collection users
  async createUser(user) {
    const usersCollection = this.db.collection('users');
    const result = await usersCollection.insertOne(user);
    return result;
  }

  // Store a file in the collection files
  async createFile(file) {
    const filesCollection = this.db.collection('files');
    const result = await filesCollection.insertOne(file);
    return result;
  }

  // returns the number of documents in the collection users
  async nbUsers() {
    try {
      const usersCollection = this.db.collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }

  // returns the number of documents in the collection files
  async nbFiles() {
    try {
      const filesCollection = this.db.collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (error) {
      throw new Error(`Error counting files: ${error.message}`);
    }
  }
}

const dbClient = new DBClient();
export default dbClient;

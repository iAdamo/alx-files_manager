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
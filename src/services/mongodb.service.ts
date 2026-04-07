import 'dotenv/config';
import mongoose from 'mongoose';
import { Db } from 'mongodb';

const MONGODB_HOST = process.env.MONGODB_HOST ?? 'mongodb';

class DatabaseService {
  private readonly url: string;
  constructor() {
    this.url = `mongodb://${MONGODB_HOST}:27017/`;
  }

  async openConnection() {
    const username = process.env.MONGO_INITDB_ROOT_USERNAME ?? '';
    const password = process.env.MONGO_INITDB_ROOT_PASSWORD ?? '';
    const connect = mongoose.connection;
    connect.on('error', console.error.bind(console, 'Ошибка подключения к базе данных:'));
    connect.once('open', () => {
      console.log('Успешное подключение к базе данных.');
    });

    await mongoose.connect(this.url, {
      auth: {
        username,
        password,
      },
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsCertificateKeyFile: './certs/client.pem',
      dbName: 'patrebna',
      authSource: 'admin',
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 120000,
    });
  }

  getDb(): Db {
    if (!mongoose.connection.db) {
      throw new Error('Database not initialized');
    }
    return mongoose.connection.db;
  }
}

const db = new DatabaseService();
export default db;

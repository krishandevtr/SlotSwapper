import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';

let mongo: MongoMemoryServer | null = null;

jest.setTimeout(60000);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  const uri = mongo.getUri();
  process.env.JWT_SECRET = 'testsecret';
  await mongoose.connect(uri);
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
});

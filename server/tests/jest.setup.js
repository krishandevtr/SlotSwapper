"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const globals_1 = require("@jest/globals");
let mongo = null;
globals_1.jest.setTimeout(60000);
beforeAll(async () => {
    mongo = await mongodb_memory_server_1.MongoMemoryServer.create({ binary: { version: '7.0.5' } });
    const uri = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    await mongoose_1.default.connect(uri);
});
beforeEach(async () => {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    const collections = await db.collections();
    for (const c of collections) {
        await c.deleteMany({});
    }
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    if (mongo) {
        await mongo.stop();
        mongo = null;
    }
});

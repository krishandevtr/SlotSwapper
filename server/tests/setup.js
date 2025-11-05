"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
let mongo;
(0, vitest_1.beforeAll)(async () => {
    mongo = await mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    await mongoose_1.default.connect(uri);
});
(0, vitest_1.beforeEach)(async () => {
    const collections = await mongoose_1.default.connection.db.collections();
    for (const c of collections) {
        await c.deleteMany({});
    }
});
(0, vitest_1.afterAll)(async () => {
    await mongoose_1.default.disconnect();
    await mongo.stop();
});

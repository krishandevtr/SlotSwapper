"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const User_1 = require("../src/models/User");
const Event_1 = require("../src/models/Event");
const app = (0, app_1.createApp)();
async function signupAndLogin(name, email, password) {
    await (0, supertest_1.default)(app).post('/api/auth/signup').send({ name, email, password }).expect(200);
    const res = await (0, supertest_1.default)(app).post('/api/auth/login').send({ email, password }).expect(200);
    return res.body.token;
}
function auth(token) {
    return { Authorization: `Bearer ${token}` };
}
describe('Auth and Events', () => {
    beforeEach(async () => {
        await User_1.UserModel.deleteMany({});
        await Event_1.EventModel.deleteMany({});
    });
    it('signs up and logs in', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/auth/signup').send({ name: 'A', email: 'a@test.com', password: 'secret1' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });
    it('CRUD on own events', async () => {
        const token = await signupAndLogin('A', 'a@test.com', 'secret1');
        const create = await (0, supertest_1.default)(app).post('/api/events').set(auth(token)).send({ title: 'Meeting', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() });
        expect(create.status).toBe(201);
        const id = create.body._id;
        const list = await (0, supertest_1.default)(app).get('/api/events').set(auth(token));
        expect(list.body).toHaveLength(1);
        const upd = await (0, supertest_1.default)(app).put(`/api/events/${id}`).set(auth(token)).send({ status: 'SWAPPABLE' });
        expect(upd.body.status).toBe('SWAPPABLE');
        const del = await (0, supertest_1.default)(app).delete(`/api/events/${id}`).set(auth(token));
        expect(del.body.ok).toBe(true);
    });
});
describe('Swap flow', () => {
    it('excludes own swappable slots from marketplace', async () => {
        const t1 = await signupAndLogin('A', 'a@test.com', 'secret1');
        const t2 = await signupAndLogin('B', 'b@test.com', 'secret1');
        const my = await (0, supertest_1.default)(app).post('/api/events').set(auth(t1)).send({ title: 'Mine', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SWAPPABLE' });
        await (0, supertest_1.default)(app).post('/api/events').set(auth(t2)).send({ title: 'Theirs', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), status: 'SWAPPABLE' });
        const res = await (0, supertest_1.default)(app).get('/api/swappable-slots').set(auth(t1));
        expect(res.body.every((e) => e.title !== 'Mine')).toBe(true);
    });
    it('creates swap request and sets slots to SWAP_PENDING', async () => {
        const t1 = await signupAndLogin('A', 'a@test.com', 'secret1');
        const t2 = await signupAndLogin('B', 'b@test.com', 'secret1');
        const my = await (0, supertest_1.default)(app).post('/api/events').set(auth(t1)).send({ title: 'A1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SWAPPABLE' });
        const their = await (0, supertest_1.default)(app).post('/api/events').set(auth(t2)).send({ title: 'B1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), status: 'SWAPPABLE' });
        const reqRes = await (0, supertest_1.default)(app).post('/api/swap-request').set(auth(t1)).send({ mySlotId: my.body._id, theirSlotId: their.body._id });
        expect(reqRes.status).toBe(201);
        const myAfter = await Event_1.EventModel.findById(my.body._id);
        const theirAfter = await Event_1.EventModel.findById(their.body._id);
        expect(myAfter?.status).toBe('SWAP_PENDING');
        expect(theirAfter?.status).toBe('SWAP_PENDING');
    });
    it('rejects swap and restores statuses', async () => {
        const t1 = await signupAndLogin('A', 'a@test.com', 'secret1');
        const t2 = await signupAndLogin('B', 'b@test.com', 'secret1');
        const my = await (0, supertest_1.default)(app).post('/api/events').set(auth(t1)).send({ title: 'A1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SWAPPABLE' });
        const their = await (0, supertest_1.default)(app).post('/api/events').set(auth(t2)).send({ title: 'B1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), status: 'SWAPPABLE' });
        const reqRes = await (0, supertest_1.default)(app).post('/api/swap-request').set(auth(t1)).send({ mySlotId: my.body._id, theirSlotId: their.body._id });
        const reject = await (0, supertest_1.default)(app).post(`/api/swap-response/${reqRes.body._id}`).set(auth(t2)).send({ accept: false });
        expect(reject.body.ok).toBe(true);
        const myAfter = await Event_1.EventModel.findById(my.body._id);
        const theirAfter = await Event_1.EventModel.findById(their.body._id);
        expect(myAfter?.status).toBe('SWAPPABLE');
        expect(theirAfter?.status).toBe('SWAPPABLE');
    });
    it('accepts swap and exchanges owners, sets BUSY', async () => {
        const t1 = await signupAndLogin('A', 'a@test.com', 'secret1');
        const t2 = await signupAndLogin('B', 'b@test.com', 'secret1');
        const eA = await (0, supertest_1.default)(app).post('/api/events').set(auth(t1)).send({ title: 'A1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SWAPPABLE' });
        const eB = await (0, supertest_1.default)(app).post('/api/events').set(auth(t2)).send({ title: 'B1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), status: 'SWAPPABLE' });
        const reqRes = await (0, supertest_1.default)(app).post('/api/swap-request').set(auth(t1)).send({ mySlotId: eA.body._id, theirSlotId: eB.body._id });
        const accept = await (0, supertest_1.default)(app).post(`/api/swap-response/${reqRes.body._id}`).set(auth(t2)).send({ accept: true });
        expect(accept.body.ok).toBe(true);
        const aEvents = await (0, supertest_1.default)(app).get('/api/events').set(auth(t1));
        const bEvents = await (0, supertest_1.default)(app).get('/api/events').set(auth(t2));
        expect(aEvents.body.some((e) => e.title === 'B1' && e.status === 'BUSY')).toBe(true);
        expect(aEvents.body.some((e) => e.title === 'A1')).toBe(false);
        expect(bEvents.body.some((e) => e.title === 'A1' && e.status === 'BUSY')).toBe(true);
        expect(bEvents.body.some((e) => e.title === 'B1')).toBe(false);
    });
    it('lists incoming and outgoing requests', async () => {
        const t1 = await signupAndLogin('A', 'a@test.com', 'secret1');
        const t2 = await signupAndLogin('B', 'b@test.com', 'secret1');
        const my = await (0, supertest_1.default)(app).post('/api/events').set(auth(t1)).send({ title: 'A1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SWAPPABLE' });
        const their = await (0, supertest_1.default)(app).post('/api/events').set(auth(t2)).send({ title: 'B1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), status: 'SWAPPABLE' });
        await (0, supertest_1.default)(app).post('/api/swap-request').set(auth(t1)).send({ mySlotId: my.body._id, theirSlotId: their.body._id });
        const incoming = await (0, supertest_1.default)(app).get('/api/requests?type=incoming').set(auth(t2));
        const outgoing = await (0, supertest_1.default)(app).get('/api/requests?type=outgoing').set(auth(t1));
        expect(incoming.body.length).toBe(1);
        expect(outgoing.body.length).toBe(1);
    });
});

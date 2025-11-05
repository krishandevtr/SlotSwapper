import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../middleware/auth';
import { EventModel } from '../models/Event';
import { SwapRequestModel } from '../models/SwapRequest';
import mongoose from 'mongoose';
import { emitToUser } from '../realtime/socket';

const router = Router();

// GET /api/swappable-slots (others' slots only)
router.get('/swappable-slots', async (req: AuthedRequest, res) => {
  const me = new mongoose.Types.ObjectId(req.user!.id);
  const slots = await EventModel.find({ userId: { $ne: me }, status: 'SWAPPABLE' }).sort({ startTime: 1 });
  res.json(slots);
});

const swapRequestSchema = z.object({
  mySlotId: z.string().min(1),
  theirSlotId: z.string().min(1)
});

// POST /api/swap-request
router.post('/swap-request', async (req: AuthedRequest, res) => {
  const parse = swapRequestSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
  const { mySlotId, theirSlotId } = parse.data;
  const myId = new mongoose.Types.ObjectId(req.user!.id);

  const mySlot = await EventModel.findOne({ _id: mySlotId, userId: myId, status: 'SWAPPABLE' });
  const theirSlot = await EventModel.findOne({ _id: theirSlotId, status: 'SWAPPABLE' });
  if (!mySlot || !theirSlot) return res.status(400).json({ message: 'Slots not available for swap' });
  if (theirSlot.userId.equals(myId)) return res.status(400).json({ message: 'Cannot swap with your own slot' });

  // Optimistic locking via conditional update
  const bulk = await EventModel.bulkWrite([
    {
      updateOne: {
        filter: { _id: mySlot._id, status: 'SWAPPABLE' },
        update: { $set: { status: 'SWAP_PENDING' } }
      }
    },
    {
      updateOne: {
        filter: { _id: theirSlot._id, status: 'SWAPPABLE' },
        update: { $set: { status: 'SWAP_PENDING' } }
      }
    }
  ]);

  const modCount = (bulk as any).modifiedCount ?? 0;
  if (modCount !== 2) {
    await EventModel.updateMany({ _id: { $in: [mySlot._id, theirSlot._id] }, status: 'SWAP_PENDING' }, { $set: { status: 'SWAPPABLE' } });
    return res.status(409).json({ message: 'Slots changed; please try again' });
  }

  const request = await SwapRequestModel.create({
    requesterId: myId,
    responderId: theirSlot.userId,
    mySlotId: mySlot._id,
    theirSlotId: theirSlot._id,
    status: 'PENDING'
  });

  emitToUser(theirSlot.userId.toString(), 'swap:incoming', { requestId: request._id });
  res.status(201).json(request);
});

// POST /api/swap-response/:id
router.post('/swap-response/:id', async (req: AuthedRequest, res) => {
  const accept = !!req.body.accept;
  const reqId = req.params.id;
  const me = new mongoose.Types.ObjectId(req.user!.id);

  const request = await SwapRequestModel.findOne({ _id: reqId, responderId: me });
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request already processed' });

  if (!accept) {
    request.status = 'REJECTED';
    await request.save();
    await EventModel.updateMany({ _id: { $in: [request.mySlotId, request.theirSlotId] }, status: 'SWAP_PENDING' }, { $set: { status: 'SWAPPABLE' } });
    emitToUser(request.requesterId.toString(), 'swap:updated', { requestId: request._id, status: 'REJECTED' });
    return res.json({ ok: true });
  }

  // Accept: swap owners and set status to BUSY
  // Step 1: mark request accepted atomically if still pending
  const updatedReq = await SwapRequestModel.findOneAndUpdate(
    { _id: reqId, responderId: me, status: 'PENDING' },
    { $set: { status: 'ACCEPTED' } },
    { new: true }
  );
  if (!updatedReq) return res.status(409).json({ message: 'Request changed; try again' });

  // Fetch slots with latest state
  const [mySlot, theirSlot] = await Promise.all([
    EventModel.findOne({ _id: request.mySlotId }),
    EventModel.findOne({ _id: request.theirSlotId })
  ]);
  if (!mySlot || !theirSlot) return res.status(400).json({ message: 'Slots missing' });

  // Conditional updates to prevent race
  const res1 = await EventModel.updateOne(
    { _id: mySlot._id, userId: request.requesterId, status: 'SWAP_PENDING' },
    { $set: { userId: request.responderId, status: 'BUSY' } }
  );
  const res2 = await EventModel.updateOne(
    { _id: theirSlot._id, userId: request.responderId, status: 'SWAP_PENDING' },
    { $set: { userId: request.requesterId, status: 'BUSY' } }
  );

  if (res1.modifiedCount !== 1 || res2.modifiedCount !== 1) {
    // rollback request status and slot statuses
    await SwapRequestModel.updateOne({ _id: request._id }, { $set: { status: 'PENDING' } });
    await EventModel.updateMany({ _id: { $in: [request.mySlotId, request.theirSlotId] }, status: 'SWAP_PENDING' }, { $set: { status: 'SWAPPABLE' } });
    return res.status(409).json({ message: 'Slots changed; try again' });
  }

  emitToUser(request.requesterId.toString(), 'swap:updated', { requestId: request._id, status: 'ACCEPTED' });
  emitToUser(request.responderId.toString(), 'swap:updated', { requestId: request._id, status: 'ACCEPTED' });
  res.json({ ok: true });
});

export default router;

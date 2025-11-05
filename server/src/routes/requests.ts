import { Router } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { SwapRequestModel } from '../models/SwapRequest';

const router = Router();

// GET /api/requests?type=incoming|outgoing
router.get('/requests', async (req: AuthedRequest, res) => {
  const type = (req.query.type as string) || 'incoming';
  const filter = type === 'outgoing'
    ? { requesterId: req.user!.id }
    : { responderId: req.user!.id };

  const requests = await SwapRequestModel.find(filter)
    .populate('mySlotId')
    .populate('theirSlotId')
    .sort({ createdAt: -1 });
  res.json(requests);
});

export default router;

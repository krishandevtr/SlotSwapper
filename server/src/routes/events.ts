import { Router } from 'express';
import { z } from 'zod';
import { EventModel, IEvent } from '../models/Event';
import { AuthedRequest } from '../middleware/auth';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(1),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: z.enum(['BUSY', 'SWAPPABLE', 'SWAP_PENDING']).optional()
});

// List own events
router.get('/', async (req: AuthedRequest, res) => {
  const events = await EventModel.find({ userId: req.user!.id }).sort({ startTime: 1 });
  res.json(events);
});

// Create event
router.post('/', async (req: AuthedRequest, res) => {
  const parse = eventSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });

  const data = parse.data as any;

  const event = await EventModel.create({
    ...data,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    status: data.status || 'BUSY',
    userId: req.user!.id
  } as Partial<IEvent>);

  res.status(201).json(event);
});

// Update event (title, times, or status) — only owner
router.put('/:id', async (req: AuthedRequest, res) => {
  const parse = eventSchema.partial().safeParse(req.body);

  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
  
  const updates: any = { ...parse.data };

  if (updates.startTime) updates.startTime = new Date(updates.startTime);
  
  if (updates.endTime) updates.endTime = new Date(updates.endTime);

  const event = await EventModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    updates,
    { new: true }
  );
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json(event);
});

// Delete event
router.delete('/:id', async (req: AuthedRequest, res) => {
  const result = await EventModel.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
  if (!result) return res.status(404).json({ message: 'Event not found' });
  res.json({ ok: true });
});

export default router;

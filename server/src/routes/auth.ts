import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserModel } from '../models/User';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function signToken(user: { id: string; email: string }) {
  return jwt.sign(user, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  const parse = signupSchema.safeParse(req.body);

  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });

  const { name, email, password } = parse.data;

  const existing = await UserModel.findOne({ email });

  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const user = new UserModel({ name, email, password });

  await user.save();
  
  console.log('User: ',user);

  const token = signToken({ id: String(user._id), email: user.email });

  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

router.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);

  if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
  const { email, password } = parse.data;

  const user = await UserModel.findOne({ email });

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await user.comparePassword(password);

  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken({ id: String(user._id), email: user.email });

  console.log("User",user);

  res.json({ token, user: { id: user._id, name: user.name, email: user.email }
    
   });
});

export default router;

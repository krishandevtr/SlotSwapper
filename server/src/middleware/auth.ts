import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtUser {
  id: string;
  email: string;
}

export interface AuthedRequest extends Request {
  user?: JwtUser;
}

export const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = header.substring('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret') as JwtUser;
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      issuer?: string;
      subscription?: any;
    }
  }
}

const getSecret = (iss: string): string | null => {
  if (iss === 'individual') return process.env.JWT_SECRET_INDIVIDUAL || null;
  if (iss === 'corporate') return process.env.JWT_SECRET_CORPORATE || null;
  return null;
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Decode without verify first — to read the issuer claim
    const decoded_peek = jwt.decode(token) as { iss?: string } | null;
    if (!decoded_peek?.iss) {
      res.status(401).json({ success: false, message: 'Invalid token structure' });
      return;
    }

    const secret = getSecret(decoded_peek.iss);
    if (!secret) {
      res.status(401).json({ success: false, message: 'Unknown token issuer' });
      return;
    }

    // Full verify with correct secret
    const decoded = jwt.verify(token, secret) as { id: string; iss: string; deviceId?: string };

    const user = await User.findById(decoded.id).select('+refreshToken').populate('org');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    if (user.isLocked()) {
      res.status(423).json({ success: false, message: 'Account temporarily locked' });
      return;
    }

    // ── One Login, One Device Policy Enforcement ──
    const incomingDeviceId = (req.headers['x-device-id'] as string) || decoded.deviceId;
    if (user.currentDeviceId && incomingDeviceId && user.currentDeviceId !== incomingDeviceId) {
      res.status(401).json({
        success: false,
        code: 'DEVICE_SWITCHED',
        message: 'You have been logged out because this account is now active on another device (One-Device Policy).',
      });
      return;
    }

    req.user = user;
    req.issuer = decoded.iss;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }
};

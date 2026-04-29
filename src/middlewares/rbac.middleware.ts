import { Request, Response, NextFunction } from 'express';

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: `Role '${req.user?.role || 'unknown'}' is not allowed to access this resource`,
    });
    return;
  }
  next();
};

export const corporateOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.issuer !== 'corporate') {
    res.status(403).json({ success: false, message: 'Access restricted to corporate portal' });
    return;
  }
  next();
};

export const individualOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.issuer !== 'individual') {
    res.status(403).json({ success: false, message: 'Access restricted to individual portal' });
    return;
  }
  next();
};

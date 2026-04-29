import { Request, Response, NextFunction } from "express";

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientApiKey = req.header("x-api-key");
  const serverApiKey = process.env.API_KEY;

  if (!clientApiKey || clientApiKey !== serverApiKey) {
    res.status(401).json({ message: "Unauthorized: Invalid API key" });
    return;
  }
  
  next();
};

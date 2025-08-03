import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

export function verifyAuthToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

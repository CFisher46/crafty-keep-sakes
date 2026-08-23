import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

export type AuthenticatedUser = {
  id?: string | number;
  type?: string;
  role_code?: string;
  [key: string]: unknown;
};

type RequestWithUser = Request & {
  user?: AuthenticatedUser | string;
};

export function getRequestUser(req: Request): AuthenticatedUser | null {
  const user = (req as RequestWithUser).user;

  if (!user || typeof user === "string") {
    return null;
  }

  return user;
}

function getUserFromRequest(req: Request): AuthenticatedUser | null {
  return getRequestUser(req);
}

function getUserRole(user: AuthenticatedUser): string {
  return String(user.type || user.role_code || "").trim().toLowerCase();
}

export function verifyAuthToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.auth_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as RequestWithUser).user = decoded as AuthenticatedUser | string;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
}

export const requireAuth = verifyAuthToken;

export function requireRole(requiredRole: string) {
  const normalizedRole = requiredRole.trim().toLowerCase();

  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (getUserRole(user) !== normalizedRole) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

export function requireSelfOrAdmin(idParam = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const isAdmin = getUserRole(user) === "admin";
    const requestId = String(req.params[idParam] || "").trim();
    const userId = String(user.id || "").trim();

    if (isAdmin || (requestId && userId && requestId === userId)) {
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden" });
    return;
  };
}

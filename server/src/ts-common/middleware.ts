import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "./jwt-secret";
import { getAuthAccount } from "./auth-account";

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

export function hasValidTokenClaims(decoded: string | jwt.JwtPayload): decoded is jwt.JwtPayload & { id: string | number; token_version: number } {
  return typeof decoded !== "string" &&
    (typeof decoded.id === "string" || typeof decoded.id === "number") &&
    /^[1-9]\d*$/.test(String(decoded.id)) &&
    Number.isInteger(decoded.token_version) && decoded.token_version >= 0;
}

export async function getCurrentTokenAccount(decoded: jwt.JwtPayload & { id: string | number; token_version: number }) {
  const account = await getAuthAccount({ id: decoded.id, type: decoded.type, role_code: decoded.role_code });
  if (!account || account.status !== "active") return { error: "inactive" as const };
  if (account.token_version !== decoded.token_version) return { error: "revoked" as const };
  if (!account.email_verified || decoded.email_verified === false || decoded.email_verified === 0) {
    return { error: "unverified" as const };
  }
  const role = String(account.role_code).trim().toLowerCase();
  if (!role || getUserRole(decoded) !== role) return { error: "permissions" as const };
  return { role };
}

export async function verifyAuthToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.auth_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    res.status(403).json({ error: "Invalid token" });
    return;
  }

  if (!hasValidTokenClaims(decoded)) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }

  try {
    const account = await getCurrentTokenAccount(decoded);
    if (account.error === "inactive") {
      res.status(403).json({ error: "Account inactive or unavailable" });
      return;
    }
    if (account.error === "revoked") {
      res.status(403).json({ error: "Session revoked. Please sign in again." });
      return;
    }
    if (account.error === "unverified") {
      res.status(403).json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" });
      return;
    }
    if (account.error === "permissions") {
      res.status(403).json({ error: "Account permissions changed. Please sign in again." });
      return;
    }
    (req as RequestWithUser).user = { ...decoded, type: account.role, role_code: account.role };
  } catch (error) {
    console.error("Authentication account lookup failed:", error);
    res.status(503).json({ error: "Authentication temporarily unavailable" });
    return;
  }
  next();
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

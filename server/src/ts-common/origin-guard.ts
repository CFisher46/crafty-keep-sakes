import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

// Paths that never carry the Cloudflare secret: platform health checks and Square's webhook.
const EXEMPT_PATHS = new Set(["/health", "/api/payments/webhook", "/api/v2/payments/webhook"]);

const SECRET_HEADER = "x-origin-secret";

const secretsMatch = (provided: string | undefined, expected: string): boolean => {
  if (!provided) return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

// Locks the API to traffic that came through Cloudflare. Inactive until ORIGIN_SECRET is set.
// A request with the valid secret is known to have passed through Cloudflare, so only then is
// CF-Connecting-IP trusted as the client address (used by the rate limiters).
export const originGuard = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.ORIGIN_SECRET;
  if (!expected || EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  if (!secretsMatch(req.get(SECRET_HEADER), expected)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const clientIp = req.get("cf-connecting-ip");
  if (clientIp) {
    Object.defineProperty(req, "ip", { value: clientIp, configurable: true });
  }
  next();
};

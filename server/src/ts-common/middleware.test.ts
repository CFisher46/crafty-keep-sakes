import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  verifyAuthToken,
  requireRole,
  requireSelfOrAdmin,
} from "./middleware";
import { db } from "./database";

jest.mock("./database", () => ({
  db: { query: jest.fn() },
}));

const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

const signToken = (payload: Record<string, unknown>) =>
  jwt.sign({ token_version: 0, ...payload }, JWT_SECRET, { expiresIn: "1h" });

describe("authorization middleware", () => {
  const accounts = new Map<string, { status: string; email_verified: boolean; role_code: string; token_version?: number }>();
  const app = express();
  app.use(cookieParser());

  app.get(
    "/admin",
    verifyAuthToken,
    requireRole("admin"),
    (_req: Request, res: Response): void => {
      res.status(200).json({ ok: true });
    }
  );

  beforeEach(() => {
    accounts.clear();
    (db.query as jest.Mock).mockReset();
    (db.query as jest.Mock).mockImplementation(async (_sql: string, [id]: [string | number]) => [
      accounts.has(String(id)) ? [{ token_version: 0, ...accounts.get(String(id)) }] : [],
    ]);
    accounts.set("1", { status: "active", email_verified: true, role_code: "admin" });
    accounts.set("7", { status: "active", email_verified: true, role_code: "customer" });
    accounts.set("42", { status: "active", email_verified: true, role_code: "customer" });
  });

  app.get(
    "/users/:id",
    verifyAuthToken,
    requireSelfOrAdmin(),
    (_req: Request, res: Response): void => {
      res.status(200).json({ ok: true });
    }
  );

  it("returns 401 for unauthenticated request", async () => {
    const response = await request(app).get("/admin");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Not authenticated" });
  });

  it("returns 403 when a non-admin user accesses admin route", async () => {
    const token = signToken({ id: 7, type: "customer" });

    const response = await request(app)
      .get("/admin")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });

  it("allows self access on self-or-admin route", async () => {
    const token = signToken({ id: 42, type: "customer" });

    const response = await request(app)
      .get("/users/42")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 403 when non-admin accesses another user's resource", async () => {
    const token = signToken({ id: 7, type: "customer" });

    const response = await request(app)
      .get("/users/42")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });

  it("allows admin access on self-or-admin route", async () => {
    accounts.set("7", { status: "active", email_verified: true, role_code: "admin" });
    const token = signToken({ id: 7, type: "admin" });

    const response = await request(app)
      .get("/users/42")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 403 for an invalid auth token", async () => {
    const response = await request(app)
      .get("/admin")
      .set("Cookie", ["auth_token=invalid.token.value"]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Invalid token" });
  });

  it("allows an admin user to access the admin route", async () => {
    const token = signToken({ id: 1, type: "admin" });

    const response = await request(app)
      .get("/admin")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("falls back to role_code when type is absent", async () => {
    const token = signToken({ id: 1, role_code: "admin" });

    const response = await request(app)
      .get("/admin")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 401 for unauthenticated request on self-or-admin route", async () => {
    const response = await request(app).get("/users/42");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Not authenticated" });
  });

  it("denies an existing admin token after demotion, even on self-or-admin routes", async () => {
    const token = signToken({ id: 1, type: "admin" });
    accounts.set("1", { status: "active", email_verified: true, role_code: "customer" });
    for (const path of ["/admin", "/users/42"]) {
      const response = await request(app).get(path).set("Cookie", [`auth_token=${token}`]);
      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/permissions changed/i);
    }
  });

  it.each(["inactive", "locked"])("rejects a token when the account is %s", async (status) => {
    const token = signToken({ id: 42, type: "customer" });
    accounts.set("42", { status, email_verified: true, role_code: "customer" });
    const response = await request(app).get("/users/42").set("Cookie", [`auth_token=${token}`]);
    expect(response.status).toBe(403);
  });

  it("rejects deleted accounts, unverified accounts, and tokens without an account id", async () => {
    const deleted = signToken({ id: 99, type: "customer" });
    const missingId = signToken({ type: "admin" });
    accounts.set("42", { status: "active", email_verified: false, role_code: "customer" });
    const unverified = signToken({ id: 42, type: "customer" });
    for (const token of [deleted, missingId, unverified]) {
      const response = await request(app).get("/users/42").set("Cookie", [`auth_token=${token}`]);
      expect(response.status).toBe(403);
    }
  });

  it("requires a fresh login after promotion instead of elevating an old token", async () => {
    const token = signToken({ id: 42, type: "customer" });
    accounts.set("42", { status: "active", email_verified: true, role_code: "admin" });
    const response = await request(app).get("/admin").set("Cookie", [`auth_token=${token}`]);
    expect(response.status).toBe(403);
  });

  it("fails closed with 503 when the account lookup fails", async () => {
    (db.query as jest.Mock).mockRejectedValueOnce(new Error("database unavailable"));
    const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const token = signToken({ id: 1, type: "admin" });
    const response = await request(app).get("/admin").set("Cookie", [`auth_token=${token}`]);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "Authentication temporarily unavailable" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("queries the current account by the verified token id", async () => {
    const token = signToken({ id: 1, type: "admin" });
    const response = await request(app).get("/admin").set("Cookie", [`auth_token=${token}`]);
    expect(response.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE u.id = ?"),
      [1]
    );
  });

  it("rejects stale, absent, and malformed token versions", async () => {
    accounts.set("1", { status: "active", email_verified: true, role_code: "admin", token_version: 1 });
    const tokens = [
      signToken({ id: 1, type: "admin", token_version: 0 }),
      jwt.sign({ id: 1, type: "admin" }, JWT_SECRET),
      signToken({ id: 1, type: "admin", token_version: "1" }),
      signToken({ id: 1, type: "admin", token_version: -1 }),
    ];
    for (const token of tokens) {
      const response = await request(app).get("/admin").set("Cookie", [`auth_token=${token}`]);
      expect(response.status).toBe(403);
    }
    const fresh = signToken({ id: 1, type: "admin", token_version: 1 });
    expect((await request(app).get("/admin").set("Cookie", [`auth_token=${fresh}`])).status).toBe(200);
  });

  it.each(["status", "role", "password"])("keeps an old token revoked after %s is restored", async () => {
    const token = signToken({ id: 1, type: "admin", token_version: 0 });
    expect((await request(app).get("/admin").set("Cookie", [`auth_token=${token}`])).status).toBe(200);
    accounts.set("1", { status: "active", email_verified: true, role_code: "admin", token_version: 2 });
    expect((await request(app).get("/admin").set("Cookie", [`auth_token=${token}`])).status).toBe(403);
  });
});

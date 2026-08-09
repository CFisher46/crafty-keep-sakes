import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  verifyAuthToken,
  requireRole,
  requireSelfOrAdmin,
} from "./middleware";

const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

const signToken = (payload: Record<string, unknown>) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

describe("authorization middleware", () => {
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
    const token = signToken({ id: 7, type: "admin" });

    const response = await request(app)
      .get("/users/42")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import authMeRouter from "./routes/auth/get/handler";
import getProductByIdRouter from "./routes/products/get-by-id/handler";
import getFilteredProductsRouter from "./routes/products/get-filtered/handler";
import getProductsRouter from "./routes/products/get/handler";
import { db } from "./ts-common/database";

jest.mock("./ts-common/database", () => ({
  db: {
    query: jest.fn()
  }
}));

const mockedDatabase = db as unknown as { query: jest.Mock };

function createTestApp() {
  const app = express();

  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/products", getProductsRouter);
  app.use("/api/products", getFilteredProductsRouter);
  app.use("/api/products", getProductByIdRouter);
  app.use("/api/auth", authMeRouter);

  return app;
}

describe("server app", () => {
  beforeEach(() => {
    mockedDatabase.query.mockReset();
  });

  it("returns parsed product payloads from GET /api/products", async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: [{ id: "prod-1", product_name: "Keepsake Box" }],
            total_count: 1
          })
        }
      ]
    ]);

    const response = await request(app).get("/api/products/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: "prod-1", product_name: "Keepsake Box" }],
      total_count: 1
    });
    expect(mockedDatabase.query).toHaveBeenCalledTimes(1);
  });

  it("parses image arrays on GET /api/products/filter", async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: [
              {
                id: "prod-2",
                product_name: "Photo Frame",
                images: JSON.stringify(["/images/frame-1.jpg"])
              }
            ]
          })
        }
      ]
    ]);

    const response = await request(app).get(
      "/api/products/filter?product_name=frame"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: "prod-2",
          product_name: "Photo Frame",
          images: ["/images/frame-1.jpg"]
        }
      ]
    });
  });

  it("returns raw rows for GET /api/products/:id", async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [{ id: "prod-3", product_name: "Memory Jar" }]
    ]);

    const response = await request(app).get("/api/products/prod-3");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "prod-3", product_name: "Memory Jar" }
    ]);
  });

  it("returns the authenticated user from GET /api/auth/me", async () => {
    const app = createTestApp();

    const token = jwt.sign(
      {
        id: "user-1",
        email_address: "customer@example.com",
        type: "customer"
      },
      process.env.JWT_SECRET as string
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      authenticated: true,
      user: {
        email_address: "customer@example.com",
        id: "user-1",
        type: "customer",
        iat: expect.any(Number)
      }
    });
  });

  it("rejects GET /api/auth/me when no token is provided", async () => {
    const app = createTestApp();

    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "No token provided" });
  });
});
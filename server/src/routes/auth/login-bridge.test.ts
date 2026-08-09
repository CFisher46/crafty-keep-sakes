import bcrypt from "bcryptjs";
import request from "supertest";

jest.mock("../../ts-common/database", () => ({
  db: {
    query: jest.fn(),
  },
}));

import app from "../../app";
import { db } from "../../ts-common/database";

const mockedDbQuery = db.query as jest.Mock;
const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);

describe("auth login bridge", () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
    consoleInfoSpy.mockClear();
    delete process.env.AUTH_SOURCE;
  });

  it("logs in using v2 source when AUTH_SOURCE=v2", async () => {
    process.env.AUTH_SOURCE = "v2";
    const passwordHash = await bcrypt.hash("Password123!", 10);

    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: "admin@example.com",
          password_hash: passwordHash,
          status: "active",
          first_name: "Ada",
          last_name: "Lovelace",
          role_code: "admin",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          town: "",
          county: "",
          postcode: "",
          telephone_number: "",
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
      rememberMe: false,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Login successful");
    expect(response.body.user).toMatchObject({
      id: 1,
      email_address: "admin@example.com",
      type: "admin",
      first_name: "Ada",
      last_name: "Lovelace",
      address_line1: "",
      address_line2: "",
      address_line3: "",
      town: "",
      county: "",
      postcode: "",
      telephone_number: "",
    });
    expect(response.body.user).not.toHaveProperty("role_code");
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "Auth login success",
      expect.objectContaining({
        source: "v2",
        user_id: 1,
        email_address: "admin@example.com",
        type: "admin",
      })
    );
  });

  it("prefers v2 users first in dual mode when both sources match", async () => {
    process.env.AUTH_SOURCE = "dual";
    const passwordHash = await bcrypt.hash("Password123!", 10);

    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: "admin@example.com",
          password_hash: passwordHash,
          status: "active",
          first_name: "Ada",
          last_name: "Lovelace",
          role_code: "admin",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          town: "",
          county: "",
          postcode: "",
          telephone_number: "",
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
      rememberMe: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email_address: "admin@example.com",
      type: "admin",
      first_name: "Ada",
      last_name: "Lovelace",
    });
    expect(mockedDbQuery).toHaveBeenCalledTimes(1);
    expect(String(mockedDbQuery.mock.calls[0][0])).toContain("FROM users_v2");
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "Auth login success",
      expect.objectContaining({
        source: "v2",
        user_id: 1,
        email_address: "admin@example.com",
        type: "admin",
      })
    );
  });

  it("falls back to legacy source in dual mode when v2 user is missing", async () => {
    process.env.AUTH_SOURCE = "dual";
    const passwordHash = await bcrypt.hash("LegacyPass!", 10);

    mockedDbQuery
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([
        [
          {
            id: "CKS_001",
            email_address: "legacy@example.com",
            password: passwordHash,
            first_name: "Grace",
            last_name: "Hopper",
            type: "customer",
            address_line1: "",
            address_line2: "",
            address_line3: "",
            town: "",
            county: "",
            postcode: "",
            telephone_number: "",
          },
        ],
      ]);

    const response = await request(app).post("/api/auth/login").send({
      email: "legacy@example.com",
      password: "LegacyPass!",
      rememberMe: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email_address: "legacy@example.com",
      type: "customer",
      first_name: "Grace",
      last_name: "Hopper",
    });
    expect(mockedDbQuery).toHaveBeenCalledTimes(2);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "Auth login success",
      expect.objectContaining({
        source: "legacy",
        user_id: "CKS_001",
        email_address: "legacy@example.com",
        type: "customer",
      })
    );
  });

  it("blocks inactive v2 users", async () => {
    process.env.AUTH_SOURCE = "v2";
    const passwordHash = await bcrypt.hash("Password123!", 10);

    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 10,
          email: "inactive@example.com",
          password_hash: passwordHash,
          status: "inactive",
          first_name: "Ina",
          last_name: "Ctive",
          role_code: "customer",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          town: "",
          county: "",
          postcode: "",
          telephone_number: "",
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: "inactive@example.com",
      password: "Password123!",
      rememberMe: false,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Account inactive" });
  });

  it("returns 401 when the password is wrong", async () => {
    process.env.AUTH_SOURCE = "v2";
    const passwordHash = await bcrypt.hash("Password123!", 10);

    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: "admin@example.com",
          password_hash: passwordHash,
          status: "active",
          first_name: "Ada",
          last_name: "Lovelace",
          role_code: "admin",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          town: "",
          county: "",
          postcode: "",
          telephone_number: "",
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword!",
      rememberMe: false,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials" });
  });
});

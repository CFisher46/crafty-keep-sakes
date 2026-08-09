import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";

const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

describe("auth routes baseline", () => {
  it("returns 401 for /api/auth/me without cookie", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "No token provided");
  });

  it("returns 200 for /api/auth/me with a valid cookie", async () => {
    const token = jwt.sign(
      {
        id: 7,
        first_name: "Ada",
        last_name: "Lovelace",
        email_address: "admin@example.com",
        type: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      authenticated: true,
      user: {
        id: 7,
        type: "admin",
        email_address: "admin@example.com",
      },
    });
  });

  it("returns 200 for /api/auth/logout", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Logged out successfully");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("auth_token=;")
      ])
    );
  });
});

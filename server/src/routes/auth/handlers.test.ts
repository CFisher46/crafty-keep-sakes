import request from "supertest";
import app from "../../app";

describe("auth routes baseline", () => {
  it("returns 401 for /api/auth/me without cookie", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "No token provided");
  });

  it("returns 200 for /api/auth/logout", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Logged out successfully");
  });
});

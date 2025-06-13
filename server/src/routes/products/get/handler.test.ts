import request from "supertest";
import app from "../../../app"; // Adjust if your Express instance is named differently

describe("GET /api/products", () => {
  it("should return a list of products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("result");
    expect(res.body.result).toHaveProperty("data");
    expect(Array.isArray(res.body.result.data)).toBe(true);
  });
});

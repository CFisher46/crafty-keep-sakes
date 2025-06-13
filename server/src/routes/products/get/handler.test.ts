import request from "supertest";
import app from "../../../app";

describe("GET /api/products", () => {
  it("should return a list of products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(JSON.parse(res.body.data))).toBe(true);
  });
});

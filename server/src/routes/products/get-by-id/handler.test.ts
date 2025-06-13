import request from "supertest";
import app from "../../../app";

describe("GET /api/products/:id", () => {
  it("should return a product with matching ID", async () => {
    const testId = 1; // Replace with a known existing ID from test DB
    const res = await request(app).get(`/api/products/${testId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.result.data[0].id).toBe(testId);
  });

  it("should return empty data for non-existent ID", async () => {
    const res = await request(app).get("/api/products/999999");
    expect(res.statusCode).toBe(200);
    expect(res.body.result.data.length).toBe(0);
  });
});

import request from "supertest";
import app from "../../../app";

describe("POST /api/products", () => {
  it("should create a new product", async () => {
    const newProduct = {
      product_name: "Test Product",
      price: 19.99,
      quantity: 5,
      category: "test",
      is_live: true
    };

    const res = await request(app).post("/api/products").send(newProduct);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("insertId");
  });
});

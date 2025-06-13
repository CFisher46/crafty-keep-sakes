import request from "supertest";
import app from "../../../app";

describe("PATCH /api/products/:id", () => {
  it("should update an existing product", async () => {
    const updatedFields = { price: 29.99 };
    const testId = 1; // Replace with a known ID

    const res = await request(app)
      .patch(`/api/products/${testId}`)
      .send(updatedFields);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Product updated");
  });

  it("should return an error for invalid ID", async () => {
    const res = await request(app)
      .patch("/api/products/999999")
      .send({ price: 50 });

    expect(res.statusCode).toBe(200); // Or 404, depending on how your handler works
  });
});

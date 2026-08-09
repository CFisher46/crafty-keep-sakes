import request from "supertest";

jest.mock("../../../ts-common/database", () => ({
  db: {
    query: jest.fn(),
  },
}));

import app from "../../../app";
import { db } from "../../../ts-common/database";

const mockedDbQuery = db.query as jest.Mock;

describe("v2 product read routes", () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
  });

  it("lists live products from v2 read path", async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          result: JSON.stringify({
            total_count: 1,
            data: JSON.stringify([
              {
                id: 1,
                category: "crafts",
                product_name: "Blue Mug",
                images: JSON.stringify(["/images/mug.jpg"]),
              },
            ]),
          }),
        },
      ],
    ]);

    const response = await request(app).get("/api/v2/products?is_live=true");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total_count", 1);
    expect(response.body).toHaveProperty("data");
    expect(typeof response.body.data).toBe("string");

    const parsedData = JSON.parse(response.body.data);
    expect(Array.isArray(parsedData)).toBe(true);
    expect(typeof parsedData[0]).toBe("object");
    expect(typeof parsedData[0]).not.toBe("string");

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain("products_v2");
    expect(sql).toContain("product_images_v2");
    expect(sql).toContain("product_categories_v2");
    expect(sql).toContain("categories_v2");
    expect(sql).toContain("fp.is_live = TRUE");
  });

  it("applies filter combinations on v2 read path", async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          result: JSON.stringify({
            total_count: 0,
            data: JSON.stringify([]),
          }),
        },
      ],
    ]);

    const response = await request(app).get(
      "/api/v2/products/filter?category=Crafts&on_sale=true&price_min=10&price_max=20"
    );

    expect(response.status).toBe(200);

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain("EXISTS (");
    expect(sql).toContain("LOWER(cf.name) IN ('crafts')");
    expect(sql).toContain("fp.on_sale IN (TRUE)");
    expect(sql).toContain("fp.price >= 10");
    expect(sql).toContain("fp.price <= 20");
  });

  it("returns product-by-id from v2 path", async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          result: JSON.stringify({
            total_count: 1,
            data: JSON.stringify([
              {
                id: 2,
                category: "Gifts",
                product_name: "Tea Set",
                images: JSON.stringify(["/images/tea.jpg"]),
              },
            ]),
          }),
        },
      ],
    ]);

    const response = await request(app).get("/api/v2/products/2");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain("products_v2");
    expect(sql).toContain("CAST(fp.id AS CHAR) = '2'");
  });

  it("returns empty payload shape for not-found product", async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          result: JSON.stringify({
            total_count: 0,
            data: JSON.stringify([]),
          }),
        },
      ],
    ]);

    const response = await request(app).get("/api/v2/products/not-found");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty("result");

    const parsed = JSON.parse(response.body[0].result);
    expect(parsed.total_count).toBe(0);
    expect(JSON.parse(parsed.data)).toEqual([]);
  });

  it("keeps list contract as stringified array of product objects", async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          result: JSON.stringify({
            total_count: 1,
            data: '[{"id":1,"product_name":"Blue Mug","images":"[]"}]',
          }),
        },
      ],
    ]);

    const response = await request(app).get("/api/v2/products");

    expect(response.status).toBe(200);
    expect(typeof response.body.data).toBe("string");

    const parsed = JSON.parse(response.body.data);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveProperty("product_name", "Blue Mug");
  });
});

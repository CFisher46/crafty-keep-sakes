import { fetchFilteredProducts } from "./productsThunks";

jest.mock("../../api/apiPath", () => ({
  buildApiUrl: (_domain: string, path = "") => `/api/products${path}`,
}));

describe("products filter regression checks", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("includes category and price filters in the request query", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "[]" }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    await fetchFilteredProducts({
      is_live: "true",
      category: "Computers",
      price_min: "50",
      price_max: "200",
      on_sale: "true",
    })(dispatch, getState, undefined);

    const requestedUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(requestedUrl).toContain("/api/products/filter?");
    expect(requestedUrl).toContain("is_live=true");
    expect(requestedUrl).toContain("category=Computers");
    expect(requestedUrl).toContain("price_min=50");
    expect(requestedUrl).toContain("price_max=200");
    expect(requestedUrl).toContain("on_sale=true");
  });

  it("parses stringified object arrays from data payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: '[{"id":"P1","product_name":"Laptop","images":"[]"}]',
      }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    const resultAction = await fetchFilteredProducts({ is_live: "true" })(
      dispatch,
      getState,
      undefined
    );

    expect(resultAction.type).toBe("products/fetchFilteredProducts/fulfilled");
    expect(resultAction.payload).toEqual([
      { id: "P1", product_name: "Laptop", images: "[]" },
    ]);
  });

  it("normalizes array-of-JSON-strings payloads into product objects", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: '["{\\"id\\":\\"P1\\",\\"product_name\\":\\"Laptop\\",\\"images\\":\\"[]\\"}"]',
      }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    const resultAction = await fetchFilteredProducts({ is_live: "true" })(
      dispatch,
      getState,
      undefined
    );

    expect(resultAction.type).toBe("products/fetchFilteredProducts/fulfilled");
    expect(resultAction.payload).toEqual([
      { id: "P1", product_name: "Laptop", images: "[]" },
    ]);
  });
});

import {
  createProduct,
  fetchFilteredProducts,
  updateProduct,
  uploadProductImages,
} from "./productsThunks";

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

  it("sends credentials when creating a product", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Product created", insertId: 1 }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn(() => ({ auth: { user: null } }));

    await createProduct(
      {
        id: "sku-1",
        category: "Computers",
        description: "Test",
        price: 100,
        quantity: 1,
        on_sale: false,
        product_name: "Test Product",
        is_live: true,
        sale_percent: 0,
        images: "",
      } as any
    )(dispatch, getState, undefined);

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.credentials).toBe("include");
  });

  it("sends credentials when updating a product", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "sku-1" }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn(() => ({ auth: { user: null } }));

    await updateProduct({ id: "sku-1", product: { price: 200 } as any })(
      dispatch,
      getState,
      undefined
    );

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.credentials).toBe("include");
  });

  it("sends credentials when uploading product images", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Images uploaded", images: [] }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    await uploadProductImages({
      productId: "sku-1",
      files: [new File(["binary"], "test.png", { type: "image/png" })],
    })(dispatch, getState, undefined);

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.credentials).toBe("include");
  });
});

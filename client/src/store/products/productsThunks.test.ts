import {
  fetchProductById,
  fetchAllProducts,
  fetchAllProductsForAdmin,
  createProduct,
  updateProduct,
  uploadProductImages,
} from './productsThunks';

jest.mock('../../api/apiPath', () => ({
  buildApiUrl: (_domain: string, path = '') => `/api/products${path}`,
}));

jest.mock('../audits/auditThunks', () => ({
  createAuditEntry: (payload: any) => ({ type: 'audits/createAuditEntry', payload }),
}));

describe('productsThunks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe('fetchProductById', () => {
    it('parses the nested JSON payload and images array', async () => {
      const rawProduct = {
        id: 'P1',
        product_name: 'Mug',
        images: '["a.jpg","b.jpg"]',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => [
          { result: JSON.stringify({ data: JSON.stringify([rawProduct]) }) },
        ],
      });

      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await fetchProductById('P1')(dispatch, getState, undefined);

      expect(result.type).toBe('products/fetchById/fulfilled');
      const payload = result.payload as { id: string; images: string[] };
      expect(payload.id).toBe('P1');
      expect(payload.images).toEqual(['a.jpg', 'b.jpg']);
    });

    it('defaults images to an empty array when absent', async () => {
      const rawProduct = { id: 'P2', product_name: 'Plate', images: '' };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => [
          { result: JSON.stringify({ data: JSON.stringify([rawProduct]) }) },
        ],
      });

      const dispatch = jest.fn();
      const result = await fetchProductById('P2')(dispatch, jest.fn(), undefined);

      const payload = result.payload as { images: string[] };
      expect(payload.images).toEqual([]);
    });
  });

  describe('fetchAllProducts', () => {
    it('fetches and parses live products successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: '[{"id":"1","product_name":"Mug"}]' }),
      });

      const dispatch = jest.fn();
      const result = await fetchAllProducts()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('products/fetchAll/fulfilled');
      expect(result.payload).toHaveLength(1);
    });

    it('requests only live products', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: '[]' }),
      });

      const dispatch = jest.fn();
      await fetchAllProducts()(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('is_live=true'));
    });

    it('rejects when API response structure is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const dispatch = jest.fn();
      const result = await fetchAllProducts()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('products/fetchAll/rejected');
      expect(result.payload).toBe('Invalid API response structure');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

      const dispatch = jest.fn();
      const result = await fetchAllProducts()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('products/fetchAll/rejected');
      expect(result.payload).toBe('Network down');
    });
  });

  describe('fetchAllProductsForAdmin', () => {
    it('fetches all products including non-live ones', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: '[{"id":"1"},{"id":"2"}]' }),
      });

      const dispatch = jest.fn();
      const result = await fetchAllProductsForAdmin()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('products/fetchAllForAdmin/fulfilled');
      expect(result.payload).toHaveLength(2);
    });

    it('does not filter by is_live', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: '[]' }),
      });

      const dispatch = jest.fn();
      await fetchAllProductsForAdmin()(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith('/api/products');
    });
  });

  describe('createProduct', () => {
    const product = {
      id: 'P1',
      product_name: 'Mug',
      category: 'Kitchen',
      description: '',
      price: 10,
      quantity: 5,
      on_sale: false,
      is_live: true,
      sale_percent: 0,
      images: '',
    } as any;

    it('creates a product and dispatches an audit entry', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Created', insertId: 1 }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: { first_name: 'A', last_name: 'B' } } }));

      const result = await createProduct(product)(dispatch, getState, undefined);

      expect(result.type).toBe('products/createProduct/fulfilled');
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'audits/createAuditEntry' })
      );
    });

    it('rejects with server error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Duplicate SKU' }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await createProduct(product)(dispatch, getState, undefined);

      expect(result.type).toBe('products/createProduct/rejected');
      expect(result.payload).toBe('Duplicate SKU');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await createProduct(product)(dispatch, getState, undefined);

      expect(result.type).toBe('products/createProduct/rejected');
      expect(result.payload).toBe('Timeout');
    });
  });

  describe('updateProduct', () => {
    it('updates a product successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'P1', product_name: 'Updated Mug' }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateProduct({ id: 'P1', product: { product_name: 'Updated Mug' } })(
        dispatch,
        getState,
        undefined
      );

      expect(result.type).toBe('products/updateProduct/fulfilled');
      const payload = result.payload as { product_name: string };
      expect(payload.product_name).toBe('Updated Mug');
    });

    it('dispatches audit entries for changed fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'P1', product_name: 'Updated Mug' }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: { first_name: 'A', last_name: 'B' } } }));

      await updateProduct({
        id: 'P1',
        product: { product_name: 'Updated Mug' },
        previousProduct: { product_name: 'Old Mug' } as any,
      })(dispatch, getState, undefined);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'audits/createAuditEntry' })
      );
    });

    it('does not dispatch audit entries for unchanged fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'P1', product_name: 'Mug' }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      await updateProduct({
        id: 'P1',
        product: { product_name: 'Mug' },
        previousProduct: { product_name: 'Mug' } as any,
      })(dispatch, getState, undefined);

      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'audits/createAuditEntry' })
      );
    });

    it('rejects with response text on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: async () => 'Product not found',
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateProduct({ id: 'P404', product: {} })(dispatch, getState, undefined);

      expect(result.type).toBe('products/updateProduct/rejected');
      expect(result.payload).toBe('Product not found');
    });

    it('rejects with generic message on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('down'));

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateProduct({ id: 'P1', product: {} })(dispatch, getState, undefined);

      expect(result.type).toBe('products/updateProduct/rejected');
      expect(result.payload).toBe('Network error');
    });
  });

  describe('uploadProductImages', () => {
    it('uploads images successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Uploaded', images: ['a.jpg'] }),
      });

      const dispatch = jest.fn();
      const file = new File(['data'], 'a.jpg', { type: 'image/jpeg' });

      const result = await uploadProductImages({ productId: 'P1', files: [file] })(
        dispatch,
        jest.fn(),
        undefined
      );

      expect(result.type).toBe('products/uploadProductImages/fulfilled');
      const payload = result.payload as { images: string[] };
      expect(payload.images).toEqual(['a.jpg']);
    });

    it('rejects with server error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'File too large' }),
      });

      const dispatch = jest.fn();
      const file = new File(['data'], 'a.jpg', { type: 'image/jpeg' });

      const result = await uploadProductImages({ productId: 'P1', files: [file] })(
        dispatch,
        jest.fn(),
        undefined
      );

      expect(result.type).toBe('products/uploadProductImages/rejected');
      expect(result.payload).toBe('File too large');
    });
  });
});

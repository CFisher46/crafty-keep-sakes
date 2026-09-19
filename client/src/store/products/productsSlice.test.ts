import reducer, { clearSelectedProduct, resetCreateStatus } from './productsSlice';
import {
  fetchAllProducts,
  fetchFilteredProducts,
  fetchProductById,
  createProduct,
  updateProduct,
} from './productsThunks';
import { ProductsState } from './types';

const sampleProduct = {
  id: '1',
  category: 'Mugs',
  description: 'A mug',
  price: 10,
  quantity: 5,
  on_sale: false,
  product_name: 'Mug',
  is_live: true,
  sale_percent: 0,
  images: [],
} as any;

const initialState: ProductsState = {
  list: [],
  catalogPriceMin: 0,
  catalogPriceMax: 0,
  selectedProduct: null,
  loading: false,
  error: null,
  createStatus: 'idle',
};

describe('productsSlice (extra reducers)', () => {
  describe('createProduct', () => {
    it('sets createStatus to loading on pending', () => {
      const state = reducer(initialState, createProduct.pending('id', {} as any));

      expect(state.createStatus).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('sets createStatus to succeeded on fulfilled', () => {
      const state = reducer(
        { ...initialState, createStatus: 'loading' },
        createProduct.fulfilled({ message: 'Created', insertId: 1 }, 'id', {} as any)
      );

      expect(state.createStatus).toBe('succeeded');
    });

    it('sets createStatus to failed with error message on rejected', () => {
      const action = createProduct.rejected(
        new Error('failed'),
        'id',
        {} as any,
        'Duplicate SKU'
      );

      const state = reducer({ ...initialState, createStatus: 'loading' }, action);

      expect(state.createStatus).toBe('failed');
      expect(state.error).toBe('Duplicate SKU');
    });
  });

  describe('fetchAllProducts', () => {
    it('sets loading true on pending', () => {
      const state = reducer(
        { ...initialState, error: 'previous' },
        fetchAllProducts.pending('id', undefined)
      );

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets list and computes catalog price bounds on fulfilled', () => {
      const products = [
        { ...sampleProduct, id: '1', price: 10 },
        { ...sampleProduct, id: '2', price: '£25.50' },
      ];

      const state = reducer(
        { ...initialState, loading: true },
        fetchAllProducts.fulfilled(products, 'id', undefined)
      );

      expect(state.loading).toBe(false);
      expect(state.list).toEqual(products);
      expect(state.catalogPriceMin).toBe(10);
      expect(state.catalogPriceMax).toBe(26);
    });

    it('defaults catalog bounds to zero when there are no valid prices', () => {
      const state = reducer(
        initialState,
        fetchAllProducts.fulfilled([], 'id', undefined)
      );

      expect(state.catalogPriceMin).toBe(0);
      expect(state.catalogPriceMax).toBe(0);
    });

    it('sets an error message on rejected', () => {
      const action = fetchAllProducts.rejected(
        new Error('failed'),
        'id',
        undefined,
        'Server error'
      );

      const state = reducer({ ...initialState, loading: true }, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Server error');
    });
  });

  describe('fetchFilteredProducts', () => {
    it('sets loading true on pending', () => {
      const state = reducer(initialState, fetchFilteredProducts.pending('id', {}));

      expect(state.loading).toBe(true);
    });

    it('parses a stringified array payload on fulfilled', () => {
      const state = reducer(
        { ...initialState, loading: true },
        fetchFilteredProducts.fulfilled(JSON.stringify([sampleProduct]) as any, 'id', {})
      );

      expect(state.loading).toBe(false);
      expect(state.list).toEqual([sampleProduct]);
    });

    it('uses the payload directly when it is already an array', () => {
      const state = reducer(
        initialState,
        fetchFilteredProducts.fulfilled([sampleProduct], 'id', {})
      );

      expect(state.list).toEqual([sampleProduct]);
    });

    it('falls back to a default error message on rejected', () => {
      const action = fetchFilteredProducts.rejected(new Error('failed'), 'id', {});

      const state = reducer({ ...initialState, loading: true }, action);

      expect(state.error).toBe('Failed to filter products');
    });
  });

  describe('fetchProductById', () => {
    it('sets selectedProduct on fulfilled', () => {
      const state = reducer(
        initialState,
        fetchProductById.fulfilled(sampleProduct, 'id', '1')
      );

      expect(state.selectedProduct).toEqual(sampleProduct);
      expect(state.loading).toBe(false);
    });

    it('sets an error on rejected', () => {
      const action = fetchProductById.rejected(new Error('failed'), 'id', '1', 'Not found');

      const state = reducer(initialState, action);

      expect(state.error).toBe('Not found');
    });
  });

  describe('updateProduct', () => {
    it('updates the matching product in the list and selectedProduct', () => {
      const updated = { ...sampleProduct, product_name: 'Updated Mug' };

      const state = reducer(
        { ...initialState, list: [sampleProduct], selectedProduct: sampleProduct },
        updateProduct.fulfilled(updated, 'id', {} as any)
      );

      expect(state.list[0].product_name).toBe('Updated Mug');
      expect(state.selectedProduct?.product_name).toBe('Updated Mug');
    });

    it('sets a fallback error message on rejected', () => {
      const action = updateProduct.rejected(new Error('failed'), 'id', {} as any, undefined);

      const state = reducer(initialState, action);

      expect(state.error).toBe('Failed to update product');
    });
  });

  describe('local reducers', () => {
    it('clears the selected product', () => {
      const state = reducer(
        { ...initialState, selectedProduct: sampleProduct },
        clearSelectedProduct()
      );

      expect(state.selectedProduct).toBeNull();
    });

    it('resets createStatus and error', () => {
      const state = reducer(
        { ...initialState, createStatus: 'failed', error: 'oops' },
        resetCreateStatus()
      );

      expect(state.createStatus).toBe('idle');
      expect(state.error).toBeNull();
    });
  });
});

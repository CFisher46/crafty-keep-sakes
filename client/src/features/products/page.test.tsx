import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import Shop from './page';
import productsReducer from '../../store/products/productsSlice';
import basketReducer from '../../store/basket/basketSlice';
import authReducer from '../../store/auth/authSlice';

jest.mock(
  'react-router-dom',
  () => ({
    useLocation: () => ({ search: '' }),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({
  products: productsReducer,
  basket: basketReducer,
  auth: authReducer,
});

const buildStore = (preloadedState?: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

const sampleProduct = {
  id: '1',
  category: 'Mugs',
  description: 'A mug',
  price: 10,
  quantity: 5,
  on_sale: false,
  product_name: 'Tea Mug',
  is_live: true,
  sale_percent: 0,
  images: [],
};

const emptyProductsState = {
  list: [],
  catalogPriceMin: 0,
  catalogPriceMax: 0,
  selectedProduct: null,
  loading: false,
  error: null,
  createStatus: 'idle',
};

// The page always dispatches fetchAllProducts on mount, so fetch is mocked
// per-test to return the data the assertions expect, then awaited via waitFor.
describe('Shop (products page)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the initial fetch is in flight', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows a "no products found" message when the list is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: '[]' }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No products found.')).toBeInTheDocument();
    });
  });

  it('renders product cards for visible products', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: JSON.stringify([sampleProduct]) }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tea Mug')).toBeInTheDocument();
      expect(screen.getByText('£10')).toBeInTheDocument();
    });
  });

  it('filters out products missing an id or name', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: JSON.stringify([sampleProduct, { ...sampleProduct, id: '', product_name: '' }]),
      }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tea Mug')).toHaveLength(1);
    });
  });

  it('adds a product to the local basket for guest users', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: JSON.stringify([sampleProduct]) }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Add to Basket')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add to Basket'));

    expect(store.getState().basket.items).toHaveLength(1);
    expect(store.getState().basket.items[0].product_name).toBe('Tea Mug');
  });

  it('opens the product details modal when View Details is clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: JSON.stringify([sampleProduct]) }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Details'));

    expect(screen.getAllByText('Tea Mug').length).toBeGreaterThan(1);
  });

  it('adds an item to the server basket for logged-in users', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: JSON.stringify([sampleProduct]) }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      products: emptyProductsState,
      auth: { isLoggedIn: true, user: { id: '1' } },
    });

    render(
      <Provider store={store}>
        <Shop />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Add to Basket')).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Basket item added',
        basket_id: 1,
        product_id: 1,
        quantity: 1,
        unit_price: 10,
      }),
    });

    fireEvent.click(screen.getByText('Add to Basket'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/items'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

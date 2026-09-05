import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import Basket from './page';
import basketReducer from '../../store/basket/basketSlice';
import authReducer from '../../store/auth/authSlice';

const rootReducer = combineReducers({ basket: basketReducer, auth: authReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

const basketItem = {
  id: '1',
  image: 'mug.jpg',
  product_name: 'Mug',
  price: 10,
  quantity: 2,
};

describe('Basket page', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders an empty basket message when there are no items', () => {
    const store = buildStore({
      basket: { items: [], totalItems: 0 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    expect(screen.getByText('Your basket is empty.')).toBeInTheDocument();
  });

  it('renders basket items with quantity and totals', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText('£10.00')).toBeInTheDocument();
    expect(screen.getByText('£20.00')).toBeInTheDocument();
    expect(screen.getByText('Total Price: £20.00')).toBeInTheDocument();
  });

  it('increments item quantity locally for guest users', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('+'));

    expect(store.getState().basket.items[0].quantity).toBe(3);
  });

  it('decrements item quantity locally for guest users', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('-'));

    expect(store.getState().basket.items[0].quantity).toBe(1);
  });

  it('removes an item locally for guest users', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Remove'));

    expect(store.getState().basket.items).toHaveLength(0);
  });

  it('disables checkout when the basket is empty', () => {
    const store = buildStore({
      basket: { items: [], totalItems: 0 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    expect(screen.queryByText('Checkout')).not.toBeInTheDocument();
  });

  it('prompts guest users to log in when starting checkout', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Checkout'));

    expect(screen.getByText('Please log in before checking out.')).toBeInTheDocument();
  });

  it('opens the delivery address modal for logged-in users on checkout', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: {
        isLoggedIn: true,
        user: { id: '1', first_name: 'John', address_line1: '123 Main St' },
      },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Checkout'));

    expect(screen.getByText('Delivery address')).toBeInTheDocument();
  });

  it('completes checkout and shows a success message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Order created',
        basket_id: 1,
        order_id: 10,
        invoice_id: 90,
        invoice_number: 'INV-001',
        total_due: 20,
      }),
    });

    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: true, user: { id: '1', first_name: 'John' } },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Checkout'));
    screen.getAllByText('Confirm checkout').forEach((el) => fireEvent.click(el));

    await waitFor(() => {
      expect(screen.getByText(/Checkout successful! Invoice INV-001/)).toBeInTheDocument();
    });
  });

  it('shows a failure message when checkout fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Checkout requires items' }),
    });

    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: true, user: { id: '1', first_name: 'John' } },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Checkout'));
    screen.getAllByText('Confirm checkout').forEach((el) => fireEvent.click(el));

    await waitFor(() => {
      expect(screen.getByText('Checkout failed. Please try again.')).toBeInTheDocument();
    });
  });
});

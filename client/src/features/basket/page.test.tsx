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

  it('renders a server basket image using the API origin', async () => {
    const previousUrl = process.env.REACT_APP_API_URL;
    process.env.REACT_APP_API_URL = 'https://api.example.test/';
    try {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [{ product_id: 1, product_name: 'Mug', quantity: 1, unit_price: 10, image_path: '/images/mug.jpg' }], total_items: 1 }),
      });
      const store = buildStore({
        basket: { items: [], totalItems: 0 },
        auth: { isLoggedIn: true, user: { id: '1' } },
      });
      render(<Provider store={store}><Basket /></Provider>);
      expect(await screen.findByRole('img', { name: 'Mug' })).toHaveAttribute('src', 'https://api.example.test/images/mug.jpg');
    } finally {
      if (previousUrl === undefined) delete process.env.REACT_APP_API_URL;
      else process.env.REACT_APP_API_URL = previousUrl;
    }
  });

  it('preserves full object-storage URLs for guest images', () => {
    const store = buildStore({
      basket: { items: [{ ...basketItem, image: 'https://files.example/mug.jpg' }], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });
    render(<Provider store={store}><Basket /></Provider>);
    expect(screen.getByRole('img', { name: 'Mug' })).toHaveAttribute('src', 'https://files.example/mug.jpg');
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

  it('previews and saves a typed quantity for guests', () => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });
    render(<Provider store={store}><Basket /></Provider>);

    const input = screen.getByLabelText('Quantity for Mug');
    expect(input).toHaveStyle({ textAlign: 'center' });
    fireEvent.change(input, { target: { value: '12' } });
    expect(screen.getByText('Total Price: £120.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    fireEvent.blur(input);
    expect(store.getState().basket.items[0].quantity).toBe(12);
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeEnabled();
  });

  it.each(['', '0', '-1', '1.5', '2147483648'])('blocks invalid basket quantity %s', (value) => {
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: false, user: null },
    });
    render(<Provider store={store}><Basket /></Provider>);
    const input = screen.getByLabelText('Quantity for Mug');
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    expect(store.getState().basket.items[0].quantity).toBe(2);
  });

  it('saves a typed quantity to the server and updates the total', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ quantity: 12 }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [{ product_id: 1, product_name: 'Mug', quantity: 2, unit_price: 10 }], total_items: 2 }),
      });
    });
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: true, user: { id: '1' } },
    });
    render(<Provider store={store}><Basket /></Provider>);
    await waitFor(() => expect(store.getState().basket.items[0].image).toBe(''));

    const input = screen.getByLabelText('Quantity for Mug');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    await waitFor(() => expect(store.getState().basket.items[0].quantity).toBe(12));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/basket/items/1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ quantity: 12 }) })
    );
    expect(screen.getByText('Total Price: £120.00')).toBeInTheDocument();
  });

  it('reports a server quantity update failure and restores the previous quantity', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Update failed' }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [{ product_id: 1, product_name: 'Mug', quantity: 2, unit_price: 10 }], total_items: 2 }),
      });
    });
    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: { isLoggedIn: true, user: { id: '1' } },
    });
    render(<Provider store={store}><Basket /></Provider>);
    await waitFor(() => expect(store.getState().basket.items[0].image).toBe(''));
    const input = screen.getByLabelText('Quantity for Mug');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    expect(await screen.findByText(/Unable to update the quantity/)).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity for Mug')).toHaveValue('2');
    expect(store.getState().basket.items[0].quantity).toBe(2);
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

  it('requires a complete delivery address before submitting checkout', async () => {
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
    screen.getAllByText('Confirm checkout').forEach((button) => fireEvent.click(button));

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent('Enter address line 1, town and postcode to continue.');
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/checkout'))).toBe(false);
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
      auth: {
        isLoggedIn: true,
        user: {
          id: '1',
          first_name: 'John',
          address_line1: '1 Test Street',
          town: 'Bristol',
          postcode: 'BS1 1AA',
        },
      },
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


  it('sends the customer to the payment page when checkout returns a payment link', async () => {
    const assign = jest.fn();
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { ...originalLocation, assign };

    try {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Checkout complete',
          basket_id: 1,
          order_id: 10,
          invoice_id: 90,
          invoice_number: 'INV-001',
          total_due: 20,
          payment_url: 'https://pay.example/checkout/abc',
          payment_error: false,
        }),
      });

      const store = buildStore({
        basket: { items: [basketItem], totalItems: 2 },
        auth: {
          isLoggedIn: true,
          user: {
            id: '1',
            first_name: 'John',
            address_line1: '1 Test Street',
            town: 'Bristol',
            postcode: 'BS1 1AA',
          },
        },
      });

      render(
        <Provider store={store}>
          <Basket />
        </Provider>
      );

      fireEvent.click(screen.getByText('Checkout'));
      screen.getAllByText('Confirm checkout').forEach((el) => fireEvent.click(el));

      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/checkout/abc'));
    } finally {
      (window as any).location = originalLocation;
    }
  });

  it('explains how to pay later when the payment could not be started', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Checkout complete',
        basket_id: 1,
        order_id: 10,
        invoice_id: 90,
        invoice_number: 'INV-001',
        total_due: 20,
        payment_url: null,
        payment_error: true,
      }),
    });

    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: {
        isLoggedIn: true,
        user: {
          id: '1',
          first_name: 'John',
          address_line1: '1 Test Street',
          town: 'Bristol',
          postcode: 'BS1 1AA',
        },
      },
    });

    render(
      <Provider store={store}>
        <Basket />
      </Provider>
    );

    fireEvent.click(screen.getByText('Checkout'));
    screen.getAllByText('Confirm checkout').forEach((el) => fireEvent.click(el));

    await waitFor(() => {
      expect(screen.getByText(/could not start the payment/)).toBeInTheDocument();
    });
  });

  it('shows a failure message when checkout fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Checkout requires items' }),
    });

    const store = buildStore({
      basket: { items: [basketItem], totalItems: 2 },
      auth: {
        isLoggedIn: true,
        user: {
          id: '1',
          first_name: 'John',
          address_line1: '1 Test Street',
          town: 'Bristol',
          postcode: 'BS1 1AA',
        },
      },
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

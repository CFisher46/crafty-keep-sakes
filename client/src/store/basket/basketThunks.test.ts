import {
  fetchBasket,
  addBasketItem,
  updateBasketItem,
  removeBasketItem,
  checkoutBasket,
  fetchOrderHistory,
  fetchInvoiceById,
  updateInvoiceStatus,
} from './basketThunks';

describe('basket thunks', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchBasket', () => {
    it('fetches basket data successfully', async () => {
      const mockData = {
        basket_id: 1,
        user_id: 7,
        status: 'active',
        items: [
          {
            id: 10,
            basket_id: 1,
            product_id: 5,
            quantity: 2,
            product_name: 'Tea Set',
            unit_price: 12.5,
            line_total: 25,
          },
        ],
        total_items: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const dispatch = jest.fn();
      const result = await fetchBasket()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchBasket/fulfilled');
      expect(result.payload).toEqual(mockData);
    });

    it('returns rejected value on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const dispatch = jest.fn();
      const result = await fetchBasket()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchBasket/rejected');
      expect(result.payload).toBe('Network error');
    });

    it('returns rejected value when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Basket not found' }),
      });

      const dispatch = jest.fn();
      const result = await fetchBasket()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchBasket/rejected');
      expect(result.payload).toBe('Basket not found');
    });

    it('sends credentials with fetch request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ basket_id: 1, items: [] }),
      });

      const dispatch = jest.fn();
      await fetchBasket()(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('addBasketItem', () => {
    it('adds a basket item successfully', async () => {
      const mockResponse = {
        message: 'Basket item added',
        basket_id: 1,
        product_id: 5,
        quantity: 2,
        unit_price: 12.5,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const item = { id: '5', image: 'tea.jpg', product_name: 'Tea Set', price: 12.5, quantity: 2 };
      const dispatch = jest.fn();
      const result = await addBasketItem(item)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/addBasketItem/fulfilled');
      const payload = result.payload as { product_id: number; quantity: number };
      expect(payload.product_id).toBe(5);
      expect(payload.quantity).toBe(2);
    });

    it('sends POST request with correct payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Added', basket_id: 1, product_id: 5, quantity: 2, unit_price: 12.5 }),
      });

      const item = { id: '5', image: 'tea.jpg', product_name: 'Tea Set', price: 12.5, quantity: 3 };
      const dispatch = jest.fn();
      await addBasketItem(item)(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/items'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: 5,
            quantity: 3,
            unit_price: 12.5,
          }),
        })
      );
    });

    it('handles add failure gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Product not found' }),
      });

      const item = { id: '999', image: '', product_name: 'Unknown', price: 0, quantity: 1 };
      const dispatch = jest.fn();
      const result = await addBasketItem(item)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/addBasketItem/rejected');
      expect(result.payload).toBe('Product not found');
    });
  });

  describe('updateBasketItem', () => {
    it('updates basket item quantity successfully', async () => {
      const mockResponse = {
        message: 'Basket item updated',
        basket_id: 1,
        product_id: 5,
        quantity: 5,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const dispatch = jest.fn();
      const result = await updateBasketItem({ productId: '5', quantity: 5 })(
        dispatch,
        jest.fn(),
        undefined
      );

      expect(result.type).toBe('basket/updateBasketItem/fulfilled');
      const payload = result.payload as { quantity: number };
      expect(payload.quantity).toBe(5);
    });

    it('sends PUT request with quantity in body', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Updated', basket_id: 1, product_id: 5, quantity: 3 }),
      });

      const dispatch = jest.fn();
      await updateBasketItem({ productId: '5', quantity: 3 })(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/items/5'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ quantity: 3 }),
        })
      );
    });
  });

  describe('removeBasketItem', () => {
    it('removes basket item successfully', async () => {
      const mockResponse = {
        message: 'Basket item removed',
        basket_id: 1,
        product_id: 5,
        affectedRows: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const dispatch = jest.fn();
      const result = await removeBasketItem('5')(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/removeBasketItem/fulfilled');
      const payload = result.payload as { affectedRows: number };
      expect(payload.affectedRows).toBe(1);
    });

    it('sends DELETE request to correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Removed', basket_id: 1, product_id: 5, affectedRows: 1 }),
      });

      const dispatch = jest.fn();
      await removeBasketItem('5')(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/items/5'),
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );
    });
  });

  describe('checkoutBasket', () => {
    it('completes checkout with delivery address', async () => {
      const mockResponse = {
        message: 'Order created',
        basket_id: 1,
        order_id: 10,
        invoice_id: 90,
        invoice_number: 'INV-001-0001',
        total_due: 25.5,
        delivery_address: {
          address_line1: '123 Main St',
          address_line2: 'Apt 4B',
          address_line3: '',
          town: 'Springfield',
          county: 'State',
          postcode: '12345',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const deliveryAddress = mockResponse.delivery_address;
      const dispatch = jest.fn();
      const result = await checkoutBasket(deliveryAddress)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/checkoutBasket/fulfilled');
      const payload = result.payload as { order_id: number; invoice_number: string };
      expect(payload.order_id).toBe(10);
      expect(payload.invoice_number).toBe('INV-001-0001');
    });

    it('completes checkout without delivery address', async () => {
      const mockResponse = {
        message: 'Order created',
        basket_id: 1,
        order_id: 10,
        invoice_id: 90,
        invoice_number: 'INV-001-0002',
        total_due: 30,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const dispatch = jest.fn();
      const result = await checkoutBasket(undefined)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/checkoutBasket/fulfilled');
      const payload = result.payload as { order_id: number };
      expect(payload.order_id).toBe(10);
    });

    it('sends POST request to checkout endpoint with delivery data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Order created',
          basket_id: 1,
          order_id: 10,
          invoice_id: 90,
          invoice_number: 'INV-001',
          total_due: 25,
        }),
      });

      const deliveryAddress = {
        address_line1: '123 Main St',
        address_line2: '',
        address_line3: '',
        town: 'Springfield',
        county: 'State',
        postcode: '12345',
      };

      const dispatch = jest.fn();
      await checkoutBasket(deliveryAddress)(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/checkout'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ delivery_address: deliveryAddress }),
        })
      );
    });

    it('handles checkout failure gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Checkout requires items' }),
      });

      const dispatch = jest.fn();
      const result = await checkoutBasket(undefined)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/checkoutBasket/rejected');
      expect(result.payload).toBe('Checkout requires items');
    });
  });

  describe('fetchOrderHistory', () => {
    it('fetches order history successfully', async () => {
      const mockOrders = [
        {
          id: 10,
          user_id: 7,
          order_status: 'placed',
          grand_total: 25.5,
          invoice_id: 90,
          invoice_number: 'INV-001-0001',
          placed_at: '2026-08-15 10:00:00',
        },
        {
          id: 11,
          user_id: 7,
          order_status: 'shipped',
          grand_total: 50.0,
          invoice_id: 91,
          invoice_number: 'INV-001-0002',
          placed_at: '2026-08-20 14:30:00',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOrders,
      });

      const dispatch = jest.fn();
      const result = await fetchOrderHistory()(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchOrderHistory/fulfilled');
      const payload = result.payload as Array<{ order_status: string }>;
      expect(payload).toHaveLength(2);
      expect(payload[0].order_status).toBe('placed');
    });

    it('sends GET request to orders endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const dispatch = jest.fn();
      await fetchOrderHistory()(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/orders'),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('fetchInvoiceById', () => {
    it('fetches invoice by id successfully', async () => {
      const mockInvoice = {
        id: 90,
        order_id: 10,
        invoice_number: 'INV-001-0001',
        invoice_status: 'unpaid',
        total_due: 25.5,
        issued_at: '2026-08-15 10:05:00',
        user_id: 7,
        delivery_address: {
          address_line1: '123 Main St',
          address_line2: '',
          address_line3: '',
          town: 'Springfield',
          county: 'State',
          postcode: '12345',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const dispatch = jest.fn();
      const result = await fetchInvoiceById(90)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchInvoiceById/fulfilled');
      const payload = result.payload as { invoice_number: string; invoice_status: string };
      expect(payload.invoice_number).toBe('INV-001-0001');
      expect(payload.invoice_status).toBe('unpaid');
    });

    it('sends GET request with invoice id in path', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 90,
          order_id: 10,
          invoice_number: 'INV-001',
          invoice_status: 'unpaid',
          total_due: 25,
          issued_at: '2026-08-15',
          user_id: 7,
        }),
      });

      const dispatch = jest.fn();
      await fetchInvoiceById(90)(dispatch, jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/invoices/90'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('returns rejected value when invoice not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invoice not found' }),
      });

      const dispatch = jest.fn();
      const result = await fetchInvoiceById(999)(dispatch, jest.fn(), undefined);

      expect(result.type).toBe('basket/fetchInvoiceById/rejected');
      expect(result.payload).toBe('Invoice not found');
    });
  });

  describe('updateInvoiceStatus', () => {
    it('updates invoice status successfully', async () => {
      const mockResponse = {
        message: 'Invoice status updated',
        affectedRows: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const dispatch = jest.fn();
      const result = await updateInvoiceStatus({ invoiceId: 90, invoiceStatus: 'paid' })(
        dispatch,
        jest.fn(),
        undefined
      );

      expect(result.type).toBe('basket/updateInvoiceStatus/fulfilled');
      const payload = result.payload as { affectedRows: number };
      expect(payload.affectedRows).toBe(1);
    });

    it('sends PUT request with invoice status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Updated', affectedRows: 1 }),
      });

      const dispatch = jest.fn();
      await updateInvoiceStatus({ invoiceId: 90, invoiceStatus: 'paid' })(
        dispatch,
        jest.fn(),
        undefined
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/basket/invoices/90'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ invoice_status: 'paid' }),
        })
      );
    });
  });
});

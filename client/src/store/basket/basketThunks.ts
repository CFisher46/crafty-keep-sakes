import { createAsyncThunk } from '@reduxjs/toolkit';
import { buildApiUrl } from '../../api/apiPath';

export type BasketItemPayload = {
  id: string;
  image: string;
  product_name: string;
  price: number;
  quantity: number;
};

export type BasketServerItem = {
  id: number;
  basket_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  unit_price: number;
  line_total: number;
};

export const fetchBasket = createAsyncThunk(
  'basket/fetchBasket',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket'), {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to load basket');
      }

      return (await response.json()) as {
        basket_id: number;
        user_id: number;
        status: string;
        items: BasketServerItem[];
        total_items: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const addBasketItem = createAsyncThunk(
  'basket/addBasketItem',
  async (item: BasketItemPayload, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', '/items'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(item.id),
          quantity: item.quantity,
          unit_price: item.price,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to add basket item');
      }

      return (await response.json()) as {
        message: string;
        basket_id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateBasketItem = createAsyncThunk(
  'basket/updateBasketItem',
  async ({ productId, quantity }: { productId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', `/items/${productId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to update basket item');
      }

      return (await response.json()) as {
        message: string;
        basket_id: number;
        product_id: number;
        quantity: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const removeBasketItem = createAsyncThunk(
  'basket/removeBasketItem',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', `/items/${productId}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to remove basket item');
      }

      return (await response.json()) as {
        message: string;
        basket_id: number;
        product_id: number;
        affectedRows: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const checkoutBasket = createAsyncThunk(
  'basket/checkoutBasket',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', '/checkout'), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Checkout failed');
      }

      return (await response.json()) as {
        message: string;
        basket_id: number;
        order_id: number;
        invoice_id: number;
        invoice_number: string;
        total_due: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchOrderHistory = createAsyncThunk(
  'basket/fetchOrderHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', '/orders'), {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to load order history');
      }

      return (await response.json()) as Array<{
        id: number;
        user_id: number;
        order_status: string;
        grand_total: number;
        placed_at: string;
      }>;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'basket/fetchInvoiceById',
  async (invoiceId: string | number, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('basket', `/invoices/${invoiceId}`), {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to load invoice');
      }

      return (await response.json()) as {
        id: number;
        order_id: number;
        invoice_number: string;
        invoice_status: string;
        total_due: number;
        issued_at: string;
        user_id: number;
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateInvoiceStatus = createAsyncThunk(
  'basket/updateInvoiceStatus',
  async (
    { invoiceId, invoiceStatus }: { invoiceId: string | number; invoiceStatus: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(buildApiUrl('basket', `/invoices/${invoiceId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_status: invoiceStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return rejectWithValue(payload.error || 'Failed to update invoice status');
      }

      return (await response.json()) as { message: string; affectedRows: number };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

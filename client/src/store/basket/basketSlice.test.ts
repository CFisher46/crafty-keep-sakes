import basketReducer, {
  addItemToBasket,
  removeItemFromBasket,
  clearBasket,
  hydrateBasketFromServer,
} from './basketSlice';
import type { BasketState } from './basketSlice';

describe('basketSlice', () => {
  const emptyState: BasketState = { items: [], totalItems: 0 };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('addItemToBasket', () => {
    it('adds a new item to an empty basket', () => {
      const item = { id: '1', image: 'img.jpg', product_name: 'Mug', price: 10, quantity: 2 };
      const state = basketReducer(emptyState, addItemToBasket(item));

      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(item);
      expect(state.totalItems).toBe(2);
    });

    it('increments quantity for an existing item', () => {
      const initial: BasketState = {
        items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 }],
        totalItems: 2,
      };

      const state = basketReducer(
        initial,
        addItemToBasket({ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 3 })
      );

      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(5);
      expect(state.totalItems).toBe(5);
    });

    it('removes item when quantity drops to zero or below', () => {
      const initial: BasketState = {
        items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 }],
        totalItems: 2,
      };

      const state = basketReducer(
        initial,
        addItemToBasket({ id: '1', image: '', product_name: 'Mug', price: 10, quantity: -2 })
      );

      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
    });

    it('does not add a new item with zero or negative quantity', () => {
      const state = basketReducer(
        emptyState,
        addItemToBasket({ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 0 })
      );

      expect(state.items).toHaveLength(0);
    });

    it('persists state to localStorage', () => {
      const item = { id: '1', image: '', product_name: 'Mug', price: 10, quantity: 1 };
      basketReducer(emptyState, addItemToBasket(item));

      const stored = JSON.parse(localStorage.getItem('basket') || '{}');
      expect(stored.items).toHaveLength(1);
    });
  });

  describe('removeItemFromBasket', () => {
    it('removes an item and decrements totalItems', () => {
      const initial: BasketState = {
        items: [
          { id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 },
          { id: '2', image: '', product_name: 'Plate', price: 5, quantity: 1 },
        ],
        totalItems: 3,
      };

      const state = basketReducer(initial, removeItemFromBasket('1'));

      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('2');
      expect(state.totalItems).toBe(1);
    });

    it('does nothing when item is not found', () => {
      const initial: BasketState = {
        items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 }],
        totalItems: 2,
      };

      const state = basketReducer(initial, removeItemFromBasket('999'));

      expect(state.items).toHaveLength(1);
      expect(state.totalItems).toBe(2);
    });
  });

  describe('clearBasket', () => {
    it('empties all items and resets totalItems', () => {
      const initial: BasketState = {
        items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 }],
        totalItems: 2,
      };

      const state = basketReducer(initial, clearBasket());

      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
    });
  });

  describe('hydrateBasketFromServer', () => {
    it('maps server items into basket items', () => {
      const payload = {
        items: [
          { product_id: 5, product_name: 'Tea Set', quantity: 2, unit_price: 12.5 },
        ],
        total_items: 2,
      };

      const state = basketReducer(emptyState, hydrateBasketFromServer(payload));

      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual({
        id: '5',
        image: '',
        product_name: 'Tea Set',
        price: 12.5,
        quantity: 2,
      });
      expect(state.totalItems).toBe(2);
    });

    it('falls back to unit_price_snapshot when unit_price is absent', () => {
      const payload = {
        items: [{ id: 9, quantity: 1, unit_price_snapshot: 7.25 }],
      };

      const state = basketReducer(emptyState, hydrateBasketFromServer(payload));

      expect(state.items[0].price).toBe(7.25);
      expect(state.items[0].id).toBe('9');
      expect(state.items[0].product_name).toBe('Product');
    });

    it('does not clear existing local items when server payload is empty', () => {
      const initial: BasketState = {
        items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 2 }],
        totalItems: 2,
      };

      const state = basketReducer(initial, hydrateBasketFromServer({ items: [] }));

      expect(state).toBe(initial);
    });

    it('computes totalItems from items when total_items is absent', () => {
      const payload = {
        items: [
          { id: 1, quantity: 2, unit_price: 5 },
          { id: 2, quantity: 3, unit_price: 10 },
        ],
      };

      const state = basketReducer(emptyState, hydrateBasketFromServer(payload));

      expect(state.totalItems).toBe(5);
    });
  });
});

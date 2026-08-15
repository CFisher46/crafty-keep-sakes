import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface BasketItem {
  id: string;
  image: string;
  product_name: string;
  price: number;
  quantity: number;
}

export interface BasketState {
  items: BasketItem[];
  totalItems: number;
}

const loadBasketFromLocalStorage = (): BasketState => {
  const storedBasket = localStorage.getItem("basket");
  if (storedBasket) {
    return JSON.parse(storedBasket);
  }
  return { items: [], totalItems: 0 };
};

const saveBasketToLocalStorage = (basket: BasketState) => {
  localStorage.setItem("basket", JSON.stringify(basket));
};

const initialState: BasketState = loadBasketFromLocalStorage();

const basketSlice = createSlice({
  name: "basket",
  initialState,
  reducers: {
    addItemToBasket: (state, action: PayloadAction<BasketItem>) => {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;

        // Remove the item if the quantity is zero or less
        if (existingItem.quantity <= 0) {
          state.items = state.items.filter(
            (item) => item.id !== action.payload.id
          );
        }
      } else if (action.payload.quantity > 0) {
        // Only add the item if the quantity is greater than zero
        state.items.push(action.payload);
      }

      // Recalculate the totalItems
      state.totalItems = state.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      saveBasketToLocalStorage(state);
    },
    removeItemFromBasket: (state, action: PayloadAction<string>) => {
      const itemIndex = state.items.findIndex(
        (item) => item.id === action.payload
      );
      if (itemIndex !== -1) {
        state.totalItems -= state.items[itemIndex].quantity;
        state.items.splice(itemIndex, 1);
        saveBasketToLocalStorage(state);
      }
    },
    clearBasket: (state) => {
      state.items = [];
      state.totalItems = 0;
      saveBasketToLocalStorage(state);
    },
    hydrateBasketFromServer: (
      state,
      action: PayloadAction<{ items?: Array<{ product_id?: number; id?: number; product_name?: string; quantity?: number; unit_price?: number | string; unit_price_snapshot?: number | string; }>; total_items?: number }>
    ) => {
      const items = action.payload.items ?? [];

      if (items.length === 0 && state.items.length > 0) {
        return;
      }

      state.items = items.map((item) => ({
        id: String(item.product_id ?? item.id ?? ''),
        image: '',
        product_name: item.product_name ?? 'Product',
        price: Number(item.unit_price ?? item.unit_price_snapshot ?? 0),
        quantity: Number(item.quantity ?? 0),
      }));
      state.totalItems = action.payload.total_items ?? state.items.reduce((sum, item) => sum + item.quantity, 0);
      saveBasketToLocalStorage(state);
    }
  }
});

export const { addItemToBasket, removeItemFromBasket, clearBasket, hydrateBasketFromServer } =
  basketSlice.actions;
export default basketSlice.reducer;

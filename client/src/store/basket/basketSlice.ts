import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BasketItem {
  id: string;
  image: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface BasketState {
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
    }
  }
});

export const { addItemToBasket, removeItemFromBasket, clearBasket } =
  basketSlice.actions;
export default basketSlice.reducer;

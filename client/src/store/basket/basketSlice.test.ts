import basketReducer, {
  addItemToBasket,
  clearBasket,
  removeItemFromBasket
} from "./basketSlice";

describe("basketSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds new items and updates the basket total", () => {
    const state = basketReducer(
      undefined,
      addItemToBasket({
        id: "prod-1",
        image: "/images/mug.jpg",
        product_name: "Keepsake Mug",
        price: 12.5,
        quantity: 2
      })
    );

    expect(state.items).toEqual([
      {
        id: "prod-1",
        image: "/images/mug.jpg",
        product_name: "Keepsake Mug",
        price: 12.5,
        quantity: 2
      }
    ]);
    expect(state.totalItems).toBe(2);
    expect(JSON.parse(localStorage.getItem("basket") || "{}")) .toEqual(state);
  });

  it("removes an item when its quantity is decremented to zero", () => {
    const startingState = {
      items: [
        {
          id: "prod-1",
          image: "/images/mug.jpg",
          product_name: "Keepsake Mug",
          price: 12.5,
          quantity: 1
        }
      ],
      totalItems: 1
    };

    const state = basketReducer(
      startingState,
      addItemToBasket({
        id: "prod-1",
        image: "/images/mug.jpg",
        product_name: "Keepsake Mug",
        price: 12.5,
        quantity: -1
      })
    );

    expect(state.items).toEqual([]);
    expect(state.totalItems).toBe(0);
  });

  it("supports explicit item removal and clearing the basket", () => {
    const startingState = {
      items: [
        {
          id: "prod-1",
          image: "/images/mug.jpg",
          product_name: "Keepsake Mug",
          price: 12.5,
          quantity: 2
        },
        {
          id: "prod-2",
          image: "/images/frame.jpg",
          product_name: "Photo Frame",
          price: 18,
          quantity: 1
        }
      ],
      totalItems: 3
    };

    const afterRemove = basketReducer(
      startingState,
      removeItemFromBasket("prod-1")
    );
    const afterClear = basketReducer(afterRemove, clearBasket());

    expect(afterRemove.items).toEqual([
      {
        id: "prod-2",
        image: "/images/frame.jpg",
        product_name: "Photo Frame",
        price: 18,
        quantity: 1
      }
    ]);
    expect(afterRemove.totalItems).toBe(1);
    expect(afterClear).toEqual({ items: [], totalItems: 0 });
  });
});
import { Box, Text, Button } from "grommet";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  clearBasket,
  hydrateBasketFromServer,
} from "../../store/basket/basketSlice";
import {
  checkoutBasket,
  fetchBasket,
  removeBasketItem,
  updateBasketItem,
} from "../../store/basket/basketThunks";
import { buttonStyles } from "../../helpers/formatting";

function Basket() {
  const dispatch = useDispatch<any>();
  const { items, totalItems } = useSelector((state: RootState) => state.basket);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const loadBasket = async () => {
      const result = await dispatch(fetchBasket());
      if (fetchBasket.fulfilled.match(result)) {
        dispatch(hydrateBasketFromServer(result.payload));
      }
    };

    loadBasket();
  }, [dispatch, isLoggedIn]);

  // Calculate the total price for all items
  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleBasketQuantity = async (itemId: string, delta: number) => {
    const nextQuantity = items.find((item) => item.id === itemId)?.quantity ?? 0;
    const adjustedQuantity = Math.max(0, nextQuantity + delta);

    if (adjustedQuantity <= 0) {
      const result = await dispatch(removeBasketItem(itemId));
      if (removeBasketItem.fulfilled.match(result)) {
        const refreshed = await dispatch(fetchBasket());
        if (fetchBasket.fulfilled.match(refreshed)) {
          dispatch(hydrateBasketFromServer(refreshed.payload));
        }
      }
      return;
    }

    const result = await dispatch(updateBasketItem({ productId: itemId, quantity: adjustedQuantity }));
    if (updateBasketItem.fulfilled.match(result)) {
      const refreshed = await dispatch(fetchBasket());
      if (fetchBasket.fulfilled.match(refreshed)) {
        dispatch(hydrateBasketFromServer(refreshed.payload));
      }
    }
  };

  const handleCheckout = async () => {
    const resultAction = await dispatch(checkoutBasket());

    if (checkoutBasket.fulfilled.match(resultAction)) {
      dispatch(clearBasket());
      localStorage.removeItem('basket');
      setInvoiceId(String(resultAction.payload.invoice_id ?? resultAction.payload.invoice_number ?? 'N/A'));
      setCheckoutMessage(`Checkout successful! Invoice ${resultAction.payload.invoice_number} has been created.`);
      const refreshed = await dispatch(fetchBasket());
      if (fetchBasket.fulfilled.match(refreshed)) {
        dispatch(hydrateBasketFromServer(refreshed.payload));
      }
      return;
    }

    setInvoiceId(null);
    setCheckoutMessage('Checkout failed. Please try again.');
  };

  return (
    <Box pad="medium" background="white" round="small" elevation="small">
      <Text size="large" weight="bold" margin={{ bottom: "medium" }}>
        Shopping Basket
      </Text>

      {checkoutMessage && (
        <Box
          pad="small"
          margin={{ bottom: 'small' }}
          round="xsmall"
          background="status-ok"
        >
          <Text color="white" weight="bold">{checkoutMessage}</Text>
          {invoiceId && (
            <Text size="small" color="white">
              Invoice ID: {invoiceId}
            </Text>
          )}
        </Box>
      )}

      {items.length === 0 ? (
        <Text>Your basket is empty.</Text>
      ) : (
        <Box>
          <Box
            direction="row"
            justify="between"
            pad={{ bottom: "small" }}
            border="bottom"
          >
            <Box flex="grow">
              <Text weight="bold">Product</Text>
            </Box>
            <Box width="xsmall" align="center">
              <Text weight="bold" textAlign="center">
                Quantity
              </Text>
            </Box>
            <Box width="xsmall" align="center">
              <Text weight="bold" textAlign="center">
                Price
              </Text>
            </Box>
            <Box width="xsmall" align="center">
              <Text weight="bold" textAlign="center">
                Total
              </Text>
            </Box>
            <Box width="xsmall" align="center">
              <Text weight="bold" textAlign="center">
                Actions
              </Text>
            </Box>
          </Box>
          {items.map((item) => (
            <Box
              key={item.id}
              direction="row"
              align="center"
              justify="between"
              pad={{ vertical: "small" }}
              border="bottom"
            >
              {/* Thumbnail and Product Name */}
              <Box direction="row" align="center" flex="grow" gap="small">
                <Box width="50px" height="50px" overflow="hidden" round="small">
                  <img
                    src={item.image || "/placeholder.png"} // Use a placeholder if no image is available
                    alt={item.product_name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                </Box>
                <Text>{item.product_name}</Text>
              </Box>

              {/* Quantity Controls */}
              <Box
                direction="row"
                align="center"
                justify="center"
                width="xsmall"
              >
                <Button
                  label="-"
                  onClick={() => handleBasketQuantity(item.id, -1)}
                  style={buttonStyles.default}
                />
                <Text margin={{ horizontal: "small" }}>{item.quantity}</Text>
                <Button
                  label="+"
                  onClick={() => handleBasketQuantity(item.id, 1)}
                  style={buttonStyles.default}
                />
              </Box>

              {/* Price */}
              <Box width="xsmall" align="center">
                <Text textAlign="center">£{Number(item.price).toFixed(2)}</Text>
              </Box>

              {/* Total */}
              <Box width="xsmall" align="center">
                <Text textAlign="center">
                  £{(item.quantity * Number(item.price)).toFixed(2)}
                </Text>
              </Box>

              {/* Remove Button */}
              <Button
                label="Remove"
                onClick={async () => {
                  const result = await dispatch(removeBasketItem(item.id));
                  if (removeBasketItem.fulfilled.match(result)) {
                    const refreshed = await dispatch(fetchBasket());
                    if (fetchBasket.fulfilled.match(refreshed)) {
                      dispatch(hydrateBasketFromServer(refreshed.payload));
                    }
                  }
                }}
                style={buttonStyles.default}
              />
            </Box>
          ))}
          <Box direction="row" justify="end" pad={{ top: "medium" }}>
            <Text weight="bold" size="large">
              Total Price: £{totalPrice.toFixed(2)}
            </Text>
          </Box>
          <Box direction="row" justify="end" pad={{ top: "small" }}>
            <Button
              label="Checkout"
              onClick={handleCheckout}
              disabled={totalItems === 0}
              style={buttonStyles.default}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default Basket;

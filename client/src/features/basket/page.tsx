import { Box, Text, Layer, TextInput } from "grommet";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  addItemToBasket,
  clearBasket,
  hydrateBasketFromServer,
  removeItemFromBasket,
} from "../../store/basket/basketSlice";
import {
  checkoutBasket,
  fetchBasket,
  removeBasketItem,
  updateBasketItem,
} from "../../store/basket/basketThunks";
import type { DeliveryAddress } from "../../types";
import { ui } from "../../helpers/theme";
import { ActionButton } from "../landingPage/components/ActionButton";
import { notifyNotificationsChanged } from "../notifications/events";

function Basket() {
  const dispatch = useDispatch<any>();
  const { items, totalItems } = useSelector((state: RootState) => state.basket);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const emptyAddress = useMemo<DeliveryAddress>(
    () => ({
      address_line1: '',
      address_line2: '',
      address_line3: '',
      town: '',
      county: '',
      postcode: '',
    }),
    []
  );
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(emptyAddress);

  useEffect(() => {
    if (!authUser) {
      setDeliveryAddress(emptyAddress);
      return;
    }

    setDeliveryAddress({
      address_line1: authUser.address_line1 || '',
      address_line2: authUser.address_line2 || '',
      address_line3: authUser.address_line3 || '',
      town: authUser.town || '',
      county: authUser.county || '',
      postcode: authUser.postcode || '',
    });
  }, [authUser, emptyAddress]);

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

  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleBasketQuantity = async (itemId: string, delta: number) => {
    const existingItem = items.find((item) => item.id === itemId);

    if (!isLoggedIn) {
      if (existingItem) {
        dispatch(addItemToBasket({ ...existingItem, quantity: delta }));
      }
      return;
    }

    const nextQuantity = existingItem?.quantity ?? 0;
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
    const resultAction = await dispatch(checkoutBasket(deliveryAddress));

    if (checkoutBasket.fulfilled.match(resultAction)) {
      const payload = resultAction.payload as {
        invoice_id?: number;
        invoice_number?: string;
      };

      dispatch(clearBasket());
      notifyNotificationsChanged();
      localStorage.removeItem('basket');
      setInvoiceId(String(payload.invoice_id ?? payload.invoice_number ?? 'N/A'));
      setCheckoutMessage(`Checkout successful! Invoice ${payload.invoice_number ?? 'N/A'} has been created.`);
      setShowCheckoutModal(false);
      const refreshed = await dispatch(fetchBasket());
      if (fetchBasket.fulfilled.match(refreshed)) {
        dispatch(hydrateBasketFromServer(refreshed.payload));
      }
      return;
    }

    setInvoiceId(null);
    setCheckoutMessage('Checkout failed. Please try again.');
    setShowCheckoutModal(false);
  };

  const handleCheckoutStart = () => {
    if (!authUser) {
      setCheckoutMessage('Please log in before checking out.');
      return;
    }

    setShowCheckoutModal(true);
  };

  const updateDeliveryField = (field: keyof DeliveryAddress, value: string) => {
    setDeliveryAddress((current) => ({ ...current, [field]: value }));
  };

  const removeItem = async (itemId: string) => {
    if (!isLoggedIn) {
      dispatch(removeItemFromBasket(itemId));
      return;
    }

    const result = await dispatch(removeBasketItem(itemId));
    if (removeBasketItem.fulfilled.match(result)) {
      const refreshed = await dispatch(fetchBasket());
      if (fetchBasket.fulfilled.match(refreshed)) {
        dispatch(hydrateBasketFromServer(refreshed.payload));
      }
    }
  };

  const inputStyle = { borderRadius: 0, fontWeight: 400 };
  const stepperStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    border: `1px solid ${ui.line}`,
    background: 'transparent',
    color: ui.ink,
    fontSize: 16,
    cursor: 'pointer',
  };

  return (
    <Box pad={{ vertical: 'medium' }} gap="medium" width={{ width: '100%', max: '1100px' }} margin="0 auto">
      {showCheckoutModal && (
        <Layer
          position="center"
          onEsc={() => setShowCheckoutModal(false)}
          onClickOutside={() => setShowCheckoutModal(false)}
          modal
          responsive={false}
          style={{ borderRadius: 0 }}
        >
          <Box pad="medium" width={{ width: '100%', max: '560px' }} gap="small" background="white">
            <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '26px', fontWeight: 400, color: ui.ink }}>
              Delivery address
            </Text>
            <Text size="small" style={{ color: ui.muted }}>
              Choose the delivery address to store on the invoice or update it before checkout.
            </Text>
            <Box alignSelf="start">
              <ActionButton
                label="Use saved delivery address"
                secondary
                onClick={() => {
                  if (authUser) {
                    setDeliveryAddress({
                      address_line1: authUser.address_line1 || '',
                      address_line2: authUser.address_line2 || '',
                      address_line3: authUser.address_line3 || '',
                      town: authUser.town || '',
                      county: authUser.county || '',
                      postcode: authUser.postcode || '',
                    });
                  }
                }}
              />
            </Box>
            <TextInput
              style={inputStyle}
              value={deliveryAddress.address_line1}
              onChange={(event) => updateDeliveryField('address_line1', event.target.value)}
              placeholder="Address line 1"
            />
            <TextInput
              style={inputStyle}
              value={deliveryAddress.address_line2}
              onChange={(event) => updateDeliveryField('address_line2', event.target.value)}
              placeholder="Address line 2"
            />
            <TextInput
              style={inputStyle}
              value={deliveryAddress.address_line3}
              onChange={(event) => updateDeliveryField('address_line3', event.target.value)}
              placeholder="Address line 3"
            />
            <Box direction="row" gap="small">
              <TextInput
                style={inputStyle}
                value={deliveryAddress.town}
                onChange={(event) => updateDeliveryField('town', event.target.value)}
                placeholder="Town"
              />
              <TextInput
                style={inputStyle}
                value={deliveryAddress.county}
                onChange={(event) => updateDeliveryField('county', event.target.value)}
                placeholder="County"
              />
            </Box>
            <TextInput
              style={inputStyle}
              value={deliveryAddress.postcode}
              onChange={(event) => updateDeliveryField('postcode', event.target.value)}
              placeholder="Postcode"
            />
            <Box direction="row" justify="end" gap="small" margin={{ top: 'small' }}>
              <ActionButton label="Cancel" secondary fixed onClick={() => setShowCheckoutModal(false)} />
              <ActionButton label="Confirm checkout" fixed onClick={handleCheckout} />
            </Box>
          </Box>
        </Layer>
      )}

      <Box gap="xxsmall">
        <Text size="small" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', color: ui.muted }}>
          Your order
        </Text>
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
          Shopping Basket
        </Text>
      </Box>

      {checkoutMessage && (
        <Box pad="small" background={ui.sand} border={{ color: ui.line }}>
          <Text weight="bold" style={{ color: ui.ink }}>{checkoutMessage}</Text>
          {invoiceId && (
            <Text size="small" style={{ color: ui.muted }}>
              Invoice ID: {invoiceId}
            </Text>
          )}
        </Box>
      )}

      {items.length === 0 ? (
        <Box pad="large" background="white" border={{ color: ui.line }} align="center">
          <Text style={{ color: ui.muted }}>Your basket is empty.</Text>
        </Box>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <Box background="white" border={{ color: ui.line }} pad={{ horizontal: 'medium' }}>
              {items.map((item, index) => (
                <Box
                  key={item.id}
                  direction="row"
                  align="center"
                  gap="medium"
                  wrap
                  pad={{ vertical: 'medium' }}
                  border={index === 0 ? undefined : { side: 'top', color: ui.line }}
                >
                  <Box width="88px" height="88px" flex={false} overflow="hidden" background={ui.sand}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Box fill align="center" justify="center">
                        <Text size="xsmall" style={{ color: ui.muted }}>No Image</Text>
                      </Box>
                    )}
                  </Box>
                  <Box flex gap="xxsmall" style={{ minWidth: 160 }}>
                    <Text style={{ fontFamily: ui.serif, fontSize: '20px', color: ui.ink }}>{item.product_name}</Text>
                    <Text size="small" style={{ color: ui.muted }}>£{Number(item.price).toFixed(2)}</Text>
                    <Box alignSelf="start">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: ui.muted, textDecoration: 'underline', fontSize: 13 }}
                      >
                        Remove
                      </button>
                    </Box>
                  </Box>
                  <Box direction="row" align="center" gap="small">
                    <button type="button" style={stepperStyle} aria-label="Decrease quantity" onClick={() => handleBasketQuantity(item.id, -1)}>-</button>
                    <Text style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                    <button type="button" style={stepperStyle} aria-label="Increase quantity" onClick={() => handleBasketQuantity(item.id, 1)}>+</button>
                  </Box>
                  <Box width="90px" align="end">
                    <Text weight="bold" style={{ color: ui.ink }}>
                      £{(item.quantity * Number(item.price)).toFixed(2)}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </div>

          <Box background="white" border={{ color: ui.line }} pad="medium" gap="medium" style={{ position: 'sticky', top: 16 }}>
            <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '22px', fontWeight: 400, color: ui.ink }}>
              Order summary
            </Text>
            <Text style={{ color: ui.muted }}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</Text>
            <Box border={{ side: 'top', color: ui.line }} pad={{ top: 'medium' }}>
              <Text weight="bold" size="large" style={{ color: ui.ink }}>
                {`Total Price: £${totalPrice.toFixed(2)}`}
              </Text>
            </Box>
            <ActionButton label="Checkout" onClick={handleCheckoutStart} disabled={totalItems === 0} />
          </Box>
        </div>
      )}
    </Box>
  );
}

export default Basket;

import { Box, Text, Button } from "grommet";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  clearBasket,
  removeItemFromBasket,
  addItemToBasket
} from "../../store/basket/basketSlice";
//import { buttonStyles } from "../../helpers/styles";

function Basket() {
  const dispatch = useDispatch();
  const { items, totalItems } = useSelector((state: RootState) => state.basket);

  // Calculate the total price for all items
  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleCheckout = () => {
    dispatch(clearBasket());
    localStorage.removeItem("basket");
  };

  return (
    <Box pad="medium">
      <Text size="large" weight="bold" margin={{ bottom: "medium" }}>
        Shopping Basket
      </Text>
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
                  onClick={() =>
                    dispatch(
                      addItemToBasket({
                        id: item.id,
                        image: item.image,
                        product_name: item.product_name,
                        price: item.price,
                        quantity: -1
                      })
                    )
                  }
                  //style={buttonStyles.default}
                />
                <Text margin={{ horizontal: "small" }}>{item.quantity}</Text>
                <Button
                  label="+"
                  onClick={() =>
                    dispatch(
                      addItemToBasket({
                        id: item.id,
                        image: item.image,
                        product_name: item.product_name,
                        price: item.price,
                        quantity: 1
                      })
                    )
                  }
                  //style={buttonStyles.default}
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
                onClick={() => dispatch(removeItemFromBasket(item.id))}
                //style={buttonStyles.default}
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
              //style={buttonStyles.default}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default Basket;

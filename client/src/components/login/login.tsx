import { Form, Box, Text, TextInput, Button } from "grommet";
import { useState } from "react";
import { loginSuccess } from "../../store/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { buttonStyles } from "../../helpers/formatting";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { removeItemFromBasket } from "../../store/basket/basketSlice";
import { addBasketItem } from "../../store/basket/basketThunks";

function UserLogin() {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const guestItems = useAppSelector((state) => state.basket.items);
  const navigate = useNavigate();

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formValues),
          credentials: "include"
        }
      );

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "An error occurred during login");
        return;
      }

      const result = await response.json();
      for (const item of guestItems) {
        const syncResult = await dispatch(addBasketItem(item));
        if (!addBasketItem.fulfilled.match(syncResult)) {
          setError(
            typeof syncResult.payload === "string"
              ? `Your basket could not be synced: ${syncResult.payload}`
              : "Your basket could not be synced. Please try again."
          );
          return;
        }

        dispatch(removeItemFromBasket(item.id));
      }
      dispatch(loginSuccess(result.user));

      navigate("/Home");
    } catch (error) {
      setError("Failed to login. Please try again.");
      console.error("Login error:", error);
    }
  };

  return (
    <Form
      value={formValues}
      onChange={(nextValue) => setFormValues(nextValue)}
      onSubmit={handleSubmit}
    >
      <Text>Please enter your details!</Text>
      <Box pad="small" gap="xsmall">
        <TextInput
          name="email"
          placeholder="Username"
          type="email"
          value={formValues.email}
          onChange={(e) =>
            setFormValues({ ...formValues, email: e.target.value })
          }
          style={{ backgroundColor: "white" }}
        />

        <TextInput
          name="password"
          placeholder="Password"
          type="password"
          value={formValues.password}
          onChange={(e) =>
            setFormValues({ ...formValues, password: e.target.value })
          }
          style={{ backgroundColor: "white" }}
        />

        {error && <Text color="status-critical">{error}</Text>}
        <Box
          direction="row"
          gap="small"
          margin={{ top: "xsmall" }}
          justify="center"
        >
          <Button
            name="login"
            type="submit"
            label="Login"
            style={buttonStyles.default}
          />
        </Box>
      </Box>
    </Form>
  );
}

export default UserLogin;

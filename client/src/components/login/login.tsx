import { Form, Box, Text, TextInput } from "grommet";
import { useState } from "react";
import { loginSuccess } from "../../store/auth/authSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { ui } from "../../helpers/theme";
import ActionButton from "../../features/landingPage/components/ActionButton";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { removeItemFromBasket } from "../../store/basket/basketSlice";
import { addBasketItem } from "../../store/basket/basketThunks";

function UserLogin() {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const guestItems = useAppSelector((state) => state.basket.items);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || ""}/api/auth/login`,
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

      // Stay on the current page unless signing in from the standalone /Login route
      if (location.pathname.toLowerCase() === "/login") {
        navigate("/Home");
      }
    } catch (error) {
      setError("Failed to login. Please try again.");
      console.error("Login error:", error);
    }
  };

  const labelStyle = {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: ui.muted,
  };
  const inputStyle = { backgroundColor: "white", borderRadius: 0 };

  return (
    <Form
      value={formValues}
      onChange={(nextValue) => setFormValues(nextValue)}
      onSubmit={handleSubmit}
    >
      <Box gap="small">
        <Text
          size="xsmall"
          weight="bold"
          style={{ letterSpacing: "0.2em", textTransform: "uppercase", color: ui.accent }}
        >
          Welcome back
        </Text>
        <Text
          as="h2"
          margin="none"
          style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: "26px", color: ui.ink }}
        >
          Sign in to your account
        </Text>

        <Box gap="xxsmall" margin={{ top: "xsmall" }}>
          <Text as="label" style={labelStyle}>Email</Text>
          <TextInput
            name="email"
            placeholder="Username"
            type="email"
            value={formValues.email}
            onChange={(e) =>
              setFormValues({ ...formValues, email: e.target.value })
            }
            style={inputStyle}
          />
        </Box>

        <Box gap="xxsmall">
          <Text as="label" style={labelStyle}>Password</Text>
          <TextInput
            name="password"
            placeholder="Password"
            type="password"
            value={formValues.password}
            onChange={(e) =>
              setFormValues({ ...formValues, password: e.target.value })
            }
            style={inputStyle}
          />
        </Box>

        {error && <Text size="small" color="status-critical">{error}</Text>}

        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton label="Login" type="submit" onClick={() => undefined} />
        </Box>
      </Box>
    </Form>
  );
}

export default UserLogin;

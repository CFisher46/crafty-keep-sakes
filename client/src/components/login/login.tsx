import { Button, Form, Box, Text, TextInput } from "grommet";
import { useEffect, useState } from "react";
import { loginSuccess } from "../../store/auth/authSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { ui } from "../../helpers/theme";
import ActionButton from "../../features/landingPage/components/ActionButton";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { removeItemFromBasket } from "../../store/basket/basketSlice";
import { addBasketItem } from "../../store/basket/basketThunks";
import { resendVerificationEmail } from "../../store/verification/verificationThunks";

function UserLogin() {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const dispatch = useAppDispatch();
  const guestItems = useAppSelector((state) => state.basket.items);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

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

  const handleResendVerification = async () => {
    setResendMessage("");
    setResendError("");
    setResending(true);
    try {
      const result = await dispatch(
        resendVerificationEmail({ email: formValues.email })
      ).unwrap();
      setResendMessage(result.message);
      setResendCooldown(60);
    } catch (reason) {
      setResendError(
        typeof reason === "string" ? reason : "Unable to send a request. Please try again."
      );
    } finally {
      setResending(false);
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
        {error === "Email not verified" && (
          <Box gap="xsmall">
            <Text size="small" style={{ color: ui.muted }}>
              Verify your email before signing in. We can send another link to this address.
            </Text>
            <Button
              plain
              label={resending ? "Requesting…" : resendCooldown > 0 ? `Try again in ${resendCooldown}s` : "Resend verification email"}
              onClick={handleResendVerification}
              disabled={resending || resendCooldown > 0 || !formValues.email.trim()}
              style={{ alignSelf: "flex-start", color: ui.accent, textDecoration: "underline" }}
            />
            {resendMessage && <Text size="small" style={{ color: ui.accent }}>{resendMessage}</Text>}
            {resendError && <Text size="small" color="status-critical">{resendError}</Text>}
          </Box>
        )}

        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton label="Login" type="submit" onClick={() => undefined} />
        </Box>
      </Box>
    </Form>
  );
}

export default UserLogin;

import { Form, Box, Text, TextInput, Button } from "grommet";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../store/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { buttonStyles } from "../../helpers/formatting";

function UserLogin() {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
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
      dispatch(loginSuccess(result.user));

      const consent = localStorage.getItem("cookieConsent");
      if (consent === "accepted") {
        document.cookie = `token=${result.token}; path=/;`;
      } else {
        localStorage.setItem("authToken", result.token);
      }

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

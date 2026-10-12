import { Form, Box, Text, TextInput } from "grommet";
import { useRef, useState } from "react";
import { ui } from "../../helpers/theme";
import ActionButton from "../../features/landingPage/components/ActionButton";

interface UserRegisterProps {
  onRegistered?: () => void;
}

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirm: "",
};

function UserRegister({ onRegistered }: UserRegisterProps) {
  const [formValues, setFormValues] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [website, setWebsite] = useState("");
  const startedAt = useRef(Date.now());

  const labelStyle = {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: ui.muted,
  };
  const inputStyle = { backgroundColor: "white", borderRadius: 0 };

  const update = (field: keyof typeof emptyForm, value: string) =>
    setFormValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError(null);

    if (
      !formValues.first_name.trim() ||
      !formValues.last_name.trim() ||
      !formValues.email.trim() ||
      !formValues.password
    ) {
      setError("Please complete all fields.");
      return;
    }
    if (formValues.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (formValues.password !== formValues.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || ""}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: formValues.first_name,
            last_name: formValues.last_name,
            email: formValues.email,
            password: formValues.password,
            website,
            started_at: startedAt.current,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error || "Registration failed. Please try again.");
        return;
      }

      setFormValues(emptyForm);
      setSuccess(true);
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    }
  };

  const field = (
    label: string,
    name: keyof typeof emptyForm,
    placeholder: string,
    type = "text"
  ) => (
    <Box gap="xxsmall" flex>
      <Text as="label" style={labelStyle}>{label}</Text>
      <TextInput
        name={name}
        placeholder={placeholder}
        type={type}
        value={formValues[name]}
        onChange={(e) => update(name, e.target.value)}
        style={inputStyle}
      />
    </Box>
  );

  if (success) {
    return (
      <Box gap="small">
        <Text
          size="xsmall"
          weight="bold"
          style={{ letterSpacing: "0.2em", textTransform: "uppercase", color: ui.accent }}
        >
          All done
        </Text>
        <Text
          as="h2"
          margin="none"
          style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: "26px", color: ui.ink }}
        >
          Your account is ready
        </Text>
        <Text size="small" style={{ color: ui.muted }}>
          You can now sign in with your email and password.
        </Text>
        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton label="Sign In" onClick={() => onRegistered?.()} />
        </Box>
      </Box>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Box gap="small">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
        />
        <Text
          size="xsmall"
          weight="bold"
          style={{ letterSpacing: "0.2em", textTransform: "uppercase", color: ui.accent }}
        >
          New here
        </Text>
        <Text
          as="h2"
          margin="none"
          style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: "26px", color: ui.ink }}
        >
          Create an account
        </Text>

        <Box direction="row" gap="small" margin={{ top: "xsmall" }}>
          {field("First name", "first_name", "First name")}
          {field("Last name", "last_name", "Last name")}
        </Box>
        {field("Email", "email", "you@example.com", "email")}
        {field("Password", "password", "At least 8 characters", "password")}
        {field("Confirm password", "confirm", "Repeat password", "password")}

        {error && <Text size="small" color="status-critical">{error}</Text>}

        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton label="Create Account" type="submit" onClick={() => undefined} />
        </Box>
      </Box>
    </Form>
  );
}

export default UserRegister;

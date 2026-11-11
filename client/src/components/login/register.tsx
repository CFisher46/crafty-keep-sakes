import { Form, Box, Button, Text, TextInput } from "grommet";
import { useEffect, useRef, useState } from "react";
import { ui } from "../../helpers/theme";
import ActionButton from "../../features/landingPage/components/ActionButton";
import { useAppDispatch } from "../../store/hooks";
import { resendVerificationEmail } from "../../store/verification/verificationThunks";
import { isValidEmail, isValidPassword } from "../../helpers/userValidation";
import PolicyModal from "../policies/policy-modal";
import { termsAndConditions } from "../policies/policies";

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

type RegisterField = keyof typeof emptyForm;

function UserRegister({ onRegistered }: UserRegisterProps) {
  const [formValues, setFormValues] = useState(emptyForm);
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [website, setWebsite] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [openedTerms, setOpenedTerms] = useState(false);
  const dispatch = useAppDispatch();
  const startedAt = useRef(Date.now());
  const registrationInProgress = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);
  const labelStyle = {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: ui.muted,
  };
  const inputStyle = { backgroundColor: "white", borderRadius: 0 };

  const update = (field: RegisterField, value: string) =>
    setFormValues((prev) => ({ ...prev, [field]: value }));

  const normalizedEmail = formValues.email.trim();
  const fieldErrors: Record<RegisterField, string> = {
    first_name: formValues.first_name.trim() ? "" : "Enter your first name.",
    last_name: formValues.last_name.trim() ? "" : "Enter your last name.",
    email: isValidEmail(normalizedEmail) ? "" : "Enter a valid email address.",
    password: isValidPassword(formValues.password) ? "" : "Password must be at least 8 characters.",
    confirm: formValues.confirm && formValues.confirm === formValues.password ? "" : "Passwords must match.",
  };

  const handleSubmit = async () => {
    if (registrationInProgress.current) return;
    setError(null);
    setTouched({ first_name: true, last_name: true, email: true, password: true, confirm: true });
    setShowTermsError(!acceptedTerms);
    if (Object.values(fieldErrors).some(Boolean) || !acceptedTerms) {
      return;
    }

    registrationInProgress.current = true;
    setRegistering(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || ""}/api/v2/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: formValues.first_name.trim(),
            last_name: formValues.last_name.trim(),
            email: normalizedEmail,
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

      const result = await response.json();
      if (typeof result.error === "string" && result.error) {
        console.error("Registration returned an error with a successful status");
        setError(result.error);
        return;
      }
      if (typeof result.verificationEmailSent !== "boolean") {
        console.error("Registration returned an unexpected response");
        setError("Unable to confirm registration. Please try signing in or contact support.");
        return;
      }
      setRegisteredEmail(normalizedEmail);
      setVerificationEmailSent(result.verificationEmailSent);
      setResendCooldown(60);
      setFormValues(emptyForm);
      setSuccess(true);
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    } finally {
      registrationInProgress.current = false;
      setRegistering(false);
    }
  };

  const handleResend = async () => {
    setResendMessage("");
    setResendError("");
    setResending(true);
    try {
      const result = await dispatch(
        resendVerificationEmail({ email: registeredEmail })
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

  const field = (
    label: string,
    name: RegisterField,
    placeholder: string,
    type = "text"
  ) => (
    <Box gap="xxsmall" flex>
      <label htmlFor={`register-${name}`} style={labelStyle}>{label}</label>
      <TextInput
        id={`register-${name}`}
        name={name}
        placeholder={placeholder}
        type={type}
        value={formValues[name]}
        aria-invalid={Boolean(touched[name] && fieldErrors[name])}
        aria-describedby={touched[name] && fieldErrors[name] ? `register-${name}-error` : undefined}
        onBlur={() => setTouched((prev) => ({ ...prev, [name]: true }))}
        onChange={(e) => update(name, e.target.value)}
        style={inputStyle}
      />
      {touched[name] && fieldErrors[name] && (
        <Text id={`register-${name}-error`} size="small" color="status-critical">
          {fieldErrors[name]}
        </Text>
      )}
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
          {verificationEmailSent ? "Check your email" : "Your account is ready"}
        </Text>
        <Text size="small" style={{ color: ui.muted }}>
          {verificationEmailSent
            ? `We sent a verification link to ${registeredEmail}. Verify your address before signing in.`
            : `Your account was created, but we couldn't send the verification email to ${registeredEmail}. Request a new one below.`}
        </Text>
        <Box gap="xsmall">
          <ActionButton
            label={resending ? "Requesting…" : resendCooldown > 0 ? `Try again in ${resendCooldown}s` : "Resend verification email"}
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
          />
          {resendMessage && <Text size="small" style={{ color: ui.accent }}>{resendMessage}</Text>}
          {resendError && <Text size="small" color="status-critical">{resendError}</Text>}
        </Box>
        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton label="Back to Sign In" onClick={() => onRegistered?.()} />
        </Box>
      </Box>
    );
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
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

        <Box gap="xxsmall">
          <Box direction="row" align="center" gap="xsmall">
            <input
              id="register-accept-terms"
              type="checkbox"
              checked={acceptedTerms}
              disabled={!openedTerms}
              aria-label="I accept the Terms & Conditions"
              aria-invalid={showTermsError}
              aria-describedby={showTermsError ? "register-terms-error" : !openedTerms ? "register-terms-hint" : undefined}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                setShowTermsError(false);
              }}
            />
            <label htmlFor="register-accept-terms">I accept the</label>
            <Button
              type="button"
              plain
              label={termsAndConditions.title}
              onClick={() => {
                setOpenedTerms(true);
                setShowTerms(true);
              }}
              style={{ color: ui.ink, textDecoration: "underline" }}
            />
          </Box>
          {!openedTerms && !showTermsError && (
            <Text id="register-terms-hint" size="small" style={{ color: ui.muted }}>
              Open the Terms & Conditions before accepting them.
            </Text>
          )}
          {showTermsError && (
            <Text id="register-terms-error" size="small" color="status-critical">
              {openedTerms
                ? "Please accept the Terms & Conditions to create an account."
                : "Please open and accept the Terms & Conditions to create an account."}
            </Text>
          )}
        </Box>
        {showTerms && (
          <PolicyModal policy={termsAndConditions} onClose={() => setShowTerms(false)} />
        )}
        {error && <Text size="small" color="status-critical">{error}</Text>}

        <Box direction="row" margin={{ top: "xsmall" }}>
          <ActionButton
            label={registering ? "Creating account..." : "Create Account"}
            type="submit"
            onClick={() => undefined}
            disabled={registering}
          />
        </Box>
      </Box>
    </Form>
  );
}

export default UserRegister;

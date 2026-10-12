import { Box, Button } from "grommet";
import { useState } from "react";
import { ui } from "../../helpers/theme";
import Login from "./login";
import Register from "./register";

interface AuthPanelProps {
  initialView?: "login" | "register";
  onBack?: () => void;
}

const linkStyle = { color: ui.muted, textDecoration: "underline" };

function AuthPanel({ initialView = "login", onBack }: AuthPanelProps) {
  const [view, setView] = useState<"login" | "register">(initialView);

  return (
    <Box align="stretch" gap="small">
      {view === "login" ? (
        <Login />
      ) : (
        <Register onRegistered={() => setView("login")} />
      )}
      <Box direction="row" justify="center" gap="small" margin={{ top: "xsmall" }}>
        <Button
          plain
          label={view === "login" ? "Create an account" : "I already have an account"}
          size="xsmall"
          onClick={() => setView(view === "login" ? "register" : "login")}
          style={linkStyle}
        />
        {onBack && (
          <Button plain label="Back" size="xsmall" onClick={onBack} style={linkStyle} />
        )}
      </Box>
    </Box>
  );
}

export default AuthPanel;

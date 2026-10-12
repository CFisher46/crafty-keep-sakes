import { Box, Button, Image, Text, ResponsiveContext } from "grommet";
import { Basket, User, Menu, Close, Notification } from "grommet-icons";
import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import NavigationBar from "../header/nav";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { ui } from "../../helpers/theme";

function PageHeader() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { totalItems } = useSelector((state: RootState) => state.basket);
  const navigate = useNavigate();
  const size = useContext(ResponsiveContext);
  const isMobile = size === "small";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const iconColor = ui.ink;

  return (
    <Box
      as="header"
      background="white"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: `1px solid ${ui.line}`,
      }}
    >
      <Box
        background={ui.ink}
        align="center"
        pad={{ vertical: "6px", horizontal: "small" }}
      >
        <Text
          size="xsmall"
          color="white"
          style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          Handcrafted wedding keepsakes · Made with love
        </Text>
      </Box>

      <Box
        direction="row"
        align="center"
        pad={{ horizontal: "medium", vertical: "xsmall" }}
        style={{ minHeight: isMobile ? "116px" : "140px" }}
      >
        <Box flex basis="0" align="start">
          {isMobile ? (
            <Button
              plain
              a11yTitle={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              icon={menuOpen ? <Close color={iconColor} /> : <Menu color={iconColor} />}
              onClick={() => setMenuOpen((open) => !open)}
              style={{ padding: "8px" }}
            />
          ) : (
            <NavigationBar onNavigate={() => undefined} resetActive={() => undefined} />
          )}
        </Box>

        <Box flex={false}>
          <Button
            onClick={() => {
              closeMenu();
              navigate("/Home");
            }}
            plain
          >
            <Image
              src="/images/Logo/Logo.PNG"
              alt="Logo"
              style={{ height: isMobile ? "104px" : "128px", width: "auto" }}
            />
          </Button>
        </Box>

        <Box flex basis="0" direction="row" gap="medium" align="center" justify="end">
          <Button
            a11yTitle="Notifications"
            onClick={() => {
              closeMenu();
              navigate("/notifications");
            }}
            icon={<Notification color={iconColor} size="20px" />}
            plain
            disabled={!userId}
          />
          <Box style={{ position: "relative" }}>
            <Button
              a11yTitle="Basket"
              icon={<Basket color={iconColor} size="20px" />}
              onClick={() => {
                closeMenu();
                navigate("/Basket");
              }}
              plain
            />
            {totalItems > 0 && (
              <Box
                background={ui.accent}
                pad={{ horizontal: "xsmall" }}
                round
                style={{ position: "absolute", top: "-8px", right: "-10px" }}
              >
                <Text size="xsmall" color="white">
                  {totalItems}
                </Text>
              </Box>
            )}
          </Box>
          <Button
            a11yTitle="Profile"
            onClick={() => {
              closeMenu();
              navigate(userId ? `/profile/${userId}` : "/Home");
            }}
            icon={<User color={iconColor} size="20px" />}
            plain
          />
        </Box>
      </Box>

      {isMobile && menuOpen && (
        <Box pad={{ horizontal: "medium", vertical: "xsmall" }} border={{ color: ui.line, side: "top" }}>
          <NavigationBar vertical onNavigate={closeMenu} resetActive={closeMenu} />
        </Box>
      )}
    </Box>
  );
}

export default PageHeader;

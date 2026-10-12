import { Box, Button, Image, Text, ResponsiveContext } from "grommet";
import { Basket, User, Menu, Close, Notification } from "grommet-icons";
import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import NavigationBar from "../header/nav";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { themeColors } from "../../helpers/theme";

function PageHeader() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { totalItems } = useSelector((state: RootState) => state.basket);
  const navigate = useNavigate();
  const size = useContext(ResponsiveContext);
  const isMobile = size === "small";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <Box
      as="header"
      background="white"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: `3px solid ${themeColors.palePink}`,
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Box
        direction="row"
        align="center"
        justify="between"
        pad={{ horizontal: "medium", vertical: "xsmall" }}
        style={{ position: "relative", minHeight: isMobile ? "116px" : "140px" }}
      >
        <Box width={{ min: "96px" }} align="start">
          {isMobile && (
            <Button
              plain
              a11yTitle={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              icon={menuOpen ? <Close /> : <Menu />}
              onClick={() => setMenuOpen((open) => !open)}
              style={{ padding: "8px" }}
            />
          )}
        </Box>

        <Box
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Button onClick={() => { closeMenu(); navigate("/Home"); }} plain>
            <Image
              src="/images/Logo/Logo.PNG"
              alt="Logo"
              style={{ height: isMobile ? "104px" : "128px", width: "auto" }}
            />
          </Button>
        </Box>

        <Box direction="row" gap="medium" align="center" justify="end" width={{ min: "96px" }}>
          <Button
            a11yTitle="Notifications"
            onClick={() => { closeMenu(); navigate("/notifications"); }}
            icon={<Notification />}
            plain
            disabled={!userId}
          />
          <Box style={{ position: "relative" }}>
            <Button
              a11yTitle="Basket"
              icon={<Basket />}
              onClick={() => { closeMenu(); navigate("/Basket"); }}
              plain
            />
            {totalItems > 0 && (
              <Box
                background="status-critical"
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
            onClick={() => { closeMenu(); navigate(userId ? `/profile/${userId}` : "/Home"); }}
            icon={<User />}
            plain
          />
        </Box>
      </Box>

      {isMobile ? (
        menuOpen && (
          <Box
            pad="small"
            background="white"
            border={{ color: "#f0e6ec", side: "top" }}
          >
            <NavigationBar vertical onNavigate={closeMenu} resetActive={closeMenu} />
          </Box>
        )
      ) : (
        <Box
          pad={{ vertical: "xsmall" }}
          background="white"
          border={{ color: "#f0e6ec", side: "top" }}
        >
          <NavigationBar onNavigate={() => undefined} resetActive={() => undefined} />
        </Box>
      )}
    </Box>
  );
}

export default PageHeader;

import { Box, Button, Image, Text, ResponsiveContext } from "grommet";
import { Basket, User, Menu, Close, Notification } from "grommet-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import AuthPanel from "../login/authPanel";
import NavigationBar from "../header/nav";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { ui } from "../../helpers/theme";
import { fetchUnreadNotificationCount } from "../../features/notifications/api";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../features/notifications/events";
import { useAppDispatch } from "../../store/hooks";
import { performLogout } from "../../store/auth/authThunks";
import { clearSelectedUser } from "../../store/users/usersSlice";

const NOTIFICATION_POLL_MS = 60000;

function PageHeader() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { totalItems } = useSelector((state: RootState) => state.basket);
  const navigate = useNavigate();
  const location = useLocation();
  const size = useContext(ResponsiveContext);
  const isMobile = size === "small";
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (userId) setAuthOpen(false);
  }, [userId]);

  useEffect(() => {
    if (typeof fetch !== "function" || !userId) {
      setUnreadCount(0);
      return undefined;
    }

    let isMounted = true;

    const loadUnreadCount = () => {
      fetchUnreadNotificationCount()
        .then((unread) => {
          if (isMounted) setUnreadCount(unread);
        })
        .catch(() => {
          if (isMounted) setUnreadCount(0);
        });
    };

    loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
    window.addEventListener("focus", loadUnreadCount);
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadUnreadCount();
    }, NOTIFICATION_POLL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(pollTimer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, [userId]);

  useEffect(() => {
    if (!authOpen && !accountMenuOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAuthOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authOpen, accountMenuOpen]);

  useEffect(() => {
    if (!userId) setAccountMenuOpen(false);
  }, [userId]);

  const handleLogout = () => {
    setAccountMenuOpen(false);
    closeMenu();
    dispatch(performLogout());
    dispatch(clearSelectedUser());
    navigate("/Home");
  };

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
          <Box style={{ position: "relative" }}>
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
            {unreadCount > 0 && (
              <Box
                background={ui.accent}
                pad={{ horizontal: "xsmall" }}
                round
                aria-label={`${unreadCount} unread notifications`}
                style={{ position: "absolute", top: "-8px", right: "-10px" }}
              >
                <Text size="xsmall" color="white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </Box>
            )}
          </Box>
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
            aria-expanded={userId ? accountMenuOpen : authOpen}
            aria-haspopup={userId ? "menu" : undefined}
            onClick={() => {
              closeMenu();
              if (userId) {
                setAccountMenuOpen((open) => !open);
              } else if (location.pathname.toLowerCase() === "/home") {
                // The landing page has its own sign-in panel
                setAuthOpen(false);
                window.dispatchEvent(new Event("cks:focus-login"));
              } else {
                setAuthOpen((open) => !open);
              }
            }}
            icon={<User color={iconColor} size="20px" />}
            plain
          />
        </Box>
      </Box>

      {accountMenuOpen && userId && (
        <>
          <div
            data-testid="account-menu-backdrop"
            onClick={() => setAccountMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: -1 }}
          />
          <Box
            background="white"
            role="menu"
            aria-label="Account"
            border={{ color: ui.line }}
            style={{
              position: "absolute",
              top: "100%",
              right: "16px",
              minWidth: "180px",
              boxShadow: "0 12px 32px rgba(43, 38, 35, 0.14)",
            }}
          >
            {[
              {
                label: "My profile",
                onClick: () => {
                  setAccountMenuOpen(false);
                  navigate(`/profile/${userId}`);
                },
              },
              {
                label: "My invoices",
                onClick: () => {
                  setAccountMenuOpen(false);
                  navigate("/invoices");
                },
              },
              { label: "Log out", onClick: handleLogout },
            ].map((item) => (
              <Button
                key={item.label}
                role="menuitem"
                plain
                onClick={item.onClick}
                style={{
                  padding: "12px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: ui.ink,
                  textAlign: "left",
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </>
      )}

      {authOpen && !userId && (
        <>
          <div
            data-testid="auth-backdrop"
            onClick={() => setAuthOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: -1 }}
          />
          <Box
            background="white"
            pad="large"
            role="dialog"
            aria-label="Sign in"
            border={{ color: ui.line }}
            style={{
              position: "absolute",
              top: "100%",
              right: "16px",
              width: "min(380px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto",
              boxShadow: "0 12px 32px rgba(43, 38, 35, 0.14)",
            }}
          >
            <AuthPanel onBack={() => setAuthOpen(false)} />
          </Box>
        </>
      )}

      {isMobile && menuOpen && (
        <Box pad={{ horizontal: "medium", vertical: "xsmall" }} border={{ color: ui.line, side: "top" }}>
          <NavigationBar vertical onNavigate={closeMenu} resetActive={closeMenu} />
        </Box>
      )}
    </Box>
  );
}

export default PageHeader;

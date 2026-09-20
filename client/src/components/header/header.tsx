import { Header, Box, Button, Image, Text } from "grommet";
import { Basket, User, Notification } from "grommet-icons";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import NavigationBar from "../header/nav";
import { NavigationBarProps } from "../header/types";
import { RootState } from "../../store";
import { useSelector } from "react-redux";

function PageHeader() {
  const navigationRef = useRef<NavigationBarProps>(null);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const navigate = useNavigate();
  // Removed items for linting
  const { totalItems } = useSelector((state: RootState) => state.basket);
  const resetNavigationActive = () => {
    if (navigationRef.current) {
      navigationRef.current.resetActive?.();
    }
  };

  // const isLoggedIn = useAppSelector(
  //   (state: RootState) => state.auth.isLoggedIn
  // );

  return (
    <Box
      pad="xsmall"
      //style={headerStyles.container as React.CSSProperties}
      background={"white"}
      elevation="small"
      round="small"
    >
      <Header pad="xsmall">
        <Box pad={{ left: "small" }} align="center" justify="center">
          <Button onClick={() => navigate("/Home")} plain>
            <Image
              src="/images/Logo/Logo.PNG"
              alt="Logo"
              style={{ width: "150px", height: "auto" }}
            />
          </Button>
        </Box>
        <Box direction="row" gap="medium" margin={{ left: "auto" }}>
          <Box pad={{ left: "small" }} align="center" justify="center">
            <Button
              a11yTitle="Notifications"
              onClick={() => navigate(`/notifications`)}
              icon={<Notification />}
              plain
              disabled={!userId}
            />
          </Box>
          <Box style={{ position: "relative" }}>
            <Button
              //disabled={totalItems == 0}
              a11yTitle="Basket"
              icon={<Basket />}
              onClick={() => navigate("/Basket")}
              plain
            />
            {totalItems > 0 && (
              <Box
                background="status-critical"
                pad={{ horizontal: "xsmall" }}
                round
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  fontSize: "12px"
                }}
              >
                <Text size="xsmall" color="white">
                  {totalItems}
                </Text>
              </Box>
            )}
          </Box>
          <Button
            a11yTitle="Profile"
            onClick={() => navigate(`/profile/${userId}`)}
            icon={<User />}
            plain
          //disabled={!isLoggedIn}
          />
        </Box>
      </Header>

      <Box
        border={{ color: "light-4", size: "small", side: "bottom" }}
        margin={{ vertical: "small" }}
      />

      <NavigationBar
        onNavigate={(route) => console.log(`Navigated to ${route}`)}
        resetActive={resetNavigationActive}
      />
    </Box>
  );
}

export default PageHeader;

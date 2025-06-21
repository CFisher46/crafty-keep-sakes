import { Header, Box, Button, Image, Text } from "grommet";
import { Basket, User } from "grommet-icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import SearchBar from "../header/searchBar";
import NavigationBar from "../header/nav";
import { NavigationBarProps } from "../header/types";

function PageHeader() {
  const dispatch = useDispatch();
  const navigationRef = useRef<NavigationBarProps>(null);
  const navigate = useNavigate();

  const resetNavigationActive = () => {
    if (navigationRef.current) {
      navigationRef.current.resetActive?.();
    }
  };

  //   useEffect(() => {
  //     checkLogin(dispatch);
  //   }, [isLoggedIn, dispatch]);

  return (
    <Box
      pad="xsmall"
      //style={headerStyles.container as React.CSSProperties}
      background={"white"}
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
        <Box
          align="center"
          justify="center"
          flex="grow"
          direction="row"
          gap="xsmall"
        >
          <SearchBar />
          <Button
            label="Search"
            onClick={() => console.log("Search clicked")}
            //style={buttonStyles.default as React.CSSProperties}
            size="small"
          />
        </Box>

        <Box direction="row" gap="small" margin={{ left: "auto" }}>
          <Box style={{ position: "relative" }}>
            <Button
              //disabled={totalItems == 0}
              icon={<Basket />}
              onClick={() => navigate("/Basket")}
            />
            {/* {totalItems > 0 && (
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
            )} */}
          </Box>
          <Button
            onClick={() => navigate("/profile")}
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

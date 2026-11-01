import { Box, Grommet } from "grommet";
import Header from "../src/components/header/header";
import MainBody from "../src/components/mainContainer/mainBody";
import Footer from "../src/components/footer/footer";
import { appTheme } from "./helpers/theme";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { checkAuth } from "./store/auth/authThunks";

function App() {
  const dispatch = useDispatch<any>();

  // Restore the session on first load wherever the user lands, not only on the home page
  useEffect(() => {
    dispatch(checkAuth())
      .unwrap()
      .catch(() => undefined);
  }, [dispatch]);

  return (
    <Grommet theme={appTheme} full>
      <Header />
      <Box align="center" pad={"4px"} />
      <MainBody />
      <Box align="center" pad={"4px"} />
      <Footer />
    </Grommet>
  );
}

export default App;

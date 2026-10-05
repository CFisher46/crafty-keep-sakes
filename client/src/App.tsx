import { Box, Grommet } from "grommet";
import Header from "../src/components/header/header";
import MainBody from "../src/components/mainContainer/mainBody";
import Footer from "../src/components/footer/footer";
import { appTheme } from "./helpers/theme";

function App() {
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

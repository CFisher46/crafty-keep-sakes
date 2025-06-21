import { Box } from "grommet";
import Header from "../src/common-components/header/header";
import MainBody from "../src/common-components/mainContainer/mainBody";
import Footer from "../src/common-components/footer/footer";

function App() {
  return (
    <>
      <Header />
      <Box align="center" pad={"4px"} />
      <MainBody />
      <Box align="center" pad={"4px"} />
      <Footer />
    </>
  );
}

export default App;

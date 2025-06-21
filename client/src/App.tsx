import { Box } from "grommet";
import Header from "../src/components/header/header";
import MainBody from "../src/components/mainContainer/mainBody";
import Footer from "../src/components/footer/footer";

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

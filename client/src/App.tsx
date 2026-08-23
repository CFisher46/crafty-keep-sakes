import { Box, Grommet } from "grommet";
import Header from "../src/components/header/header";
import MainBody from "../src/components/mainContainer/mainBody";
import Footer from "../src/components/footer/footer";

const appTheme = {
  button: {
    default: {
      background: {
        color: '#fce5f5',
      },
      border: {
        radius: '4px',
        width: '0px',
      },
      color: 'black',
      padding: {
        vertical: '8px',
        horizontal: '16px',
      },
      extend: 'font-weight: 500;'
    },
    hover: {
      background: {
        color: '#f7d1e6',
      },
      color: 'black',
    },
    active: {
      background: {
        color: '#f3bfdc',
      },
      color: 'black',
    },
  },
};

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

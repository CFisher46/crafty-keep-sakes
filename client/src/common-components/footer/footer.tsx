import { FacebookOption, Instagram, Twitter } from "grommet-icons";
import { Anchor, Box, Footer } from "grommet";

function PageFooter() {
  return (
    <Box pad="xsmall" align="center">
      <Footer pad="small">
        <Box align="center" direction="row">
          <Media />
        </Box>
      </Footer>
    </Box>
  );
}

export default PageFooter;

const Media = () => (
  <Box direction="row" gap="xxsmall" justify="center">
    <Anchor
      a11yTitle="Share feedback on Github"
      href="https://www.instagram.com/"
      icon={<Instagram color="brand" />}
    />
    <Anchor
      a11yTitle="Chat with us on Slack"
      href="https://www.facebook.com/"
      icon={<FacebookOption color="brand" />}
    />
    <Anchor
      a11yTitle="Follow us on Twitter"
      href="https://twitter.com/"
      icon={<Twitter color="brand" />}
    />
  </Box>
);

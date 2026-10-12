import { FacebookOption, Instagram, Twitter } from "grommet-icons";
import { Anchor, Box, Footer, Text } from "grommet";
import { ui } from "../../helpers/theme";

function PageFooter() {
  return (
    <Box
      margin={{ top: "medium" }}
      background="white"
      border={{ color: ui.line, side: "top" }}
      pad={{ horizontal: "medium", vertical: "small" }}
    >
      <Footer
        pad="small"
        direction="row-responsive"
        justify="between"
        align="center"
      >
        <Text size="xsmall" style={{ color: ui.muted, letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} Crafty Keep-Sakes. Handmade with love.
        </Text>
        <Media />
      </Footer>
    </Box>
  );
}

export default PageFooter;

const Media = () => (
  <Box direction="row" gap="small" justify="center">
    <Anchor
      a11yTitle="Follow us on Instagram"
      href="https://www.instagram.com/"
      icon={<Instagram color={ui.ink} size="18px" />}
    />
    <Anchor
      a11yTitle="Find us on Facebook"
      href="https://www.facebook.com/"
      icon={<FacebookOption color={ui.ink} size="18px" />}
    />
    <Anchor
      a11yTitle="Follow us on Twitter"
      href="https://twitter.com/"
      icon={<Twitter color={ui.ink} size="18px" />}
    />
  </Box>
);

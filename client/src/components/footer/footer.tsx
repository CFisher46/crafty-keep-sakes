import { FacebookOption, Instagram, Twitter } from "grommet-icons";
import { useState } from "react";
import { Anchor, Box, Button, Footer, Text } from "grommet";
import { ui } from "../../helpers/theme";
import PolicyModal from "../policies/policy-modal";
import { footerPolicies, Policy } from "../policies/policies";

function PageFooter() {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

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
        <Box direction="row" gap="small" wrap>
          {footerPolicies.map((policy) => (
            <Button
              key={policy.fileName}
              plain
              label={policy.title}
              onClick={() => setSelectedPolicy(policy)}
              style={{ color: ui.muted, textDecoration: "underline" }}
            />
          ))}
        </Box>
        <Media />
      </Footer>
      {selectedPolicy && (
        <PolicyModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />
      )}
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

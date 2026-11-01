import { Box, Text } from 'grommet';
import { ui } from '../../../helpers/theme';

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

export default function IntroductionsPage() {
  return (
    <Box gap="small" pad={{ vertical: 'medium', horizontal: 'xsmall' }}>
      <Text style={eyebrow}>About us</Text>
      <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
        Reviews
      </Text>
      <Text style={{ color: ui.muted, lineHeight: 1.7 }}>
        We lovingly design and personalise your wedding and event stationery in our home town of Torbay, Devon. From
        start to finish, we will work alongside you through each step, helping bring your vision to life.
      </Text>
      <Text style={{ color: ui.muted, lineHeight: 1.7 }}>
        We work to a high standard, ensuring your stationery is picture perfect. We pride ourselves on providing a
        personalised service which brings your vision to reality, whilst giving you peace of mind that your stationery
        is in loving hands.
      </Text>
    </Box>
  );
}

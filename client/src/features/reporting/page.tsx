import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

export default function ReportingPage() {
  const navigate = useNavigate();

  return (
    <Box gap="medium" pad="xsmall">
      <Box gap="xxsmall">
        <Text style={eyebrow}>Admin</Text>
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
          Reporting
        </Text>
      </Box>

      <Box
        gap="small"
        pad="medium"
        background="white"
        style={{ border: `1px solid ${ui.line}`, borderRadius: '2px', maxWidth: '520px' }}
      >
        <Text style={eyebrow}>Invoices</Text>
        <Text style={{ color: ui.muted }}>
          View every customer's invoices with no restrictions, so you can update invoice status and add tracking
          details.
        </Text>
        <Box direction="row">
          <ActionButton label="View all invoices" onClick={() => navigate('/Reporting/invoices')} fixed />
        </Box>
      </Box>
    </Box>
  );
}

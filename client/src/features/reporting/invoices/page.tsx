import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { ui } from '../../../helpers/theme';
import ActionButton from '../../landingPage/components/ActionButton';
import Invoices from '../../invoices/invoices';

export default function AllInvoicesPage() {
  const navigate = useNavigate();

  return (
    <Box gap="medium" pad="xsmall">
      <Box direction="row" justify="between" align="end" wrap gap="small">
        <Box gap="xxsmall">
          <Text style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.muted }}>
            Reporting
          </Text>
          <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
            All invoices
          </Text>
        </Box>
        <ActionButton label="Back to reporting" secondary onClick={() => navigate('/Reporting')} fixed />
      </Box>
      <Invoices scope="all" userType="admin" />
    </Box>
  );
}

import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { ui } from '../../../helpers/theme';
import ActionButton from '../../landingPage/components/ActionButton';
import ReportingDashboard from '../dashboard';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Box gap="large" pad="xsmall">
      <Box direction="row" justify="between" align="end" wrap gap="small">
        <Box gap="xxsmall">
          <Text style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.muted }}>
            Reporting
          </Text>
          <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
            Dashboard
          </Text>
        </Box>
        <ActionButton label="Back to reporting" secondary compact onClick={() => navigate('/Reporting')} />
      </Box>
      <ReportingDashboard />
    </Box>
  );
}

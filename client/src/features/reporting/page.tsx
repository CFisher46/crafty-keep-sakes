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

const REPORTS = [
  {
    eyebrow: 'Dashboard',
    description: 'Orders, revenue and top products at a glance, with charts for the dates you choose.',
    label: 'Open dashboard',
    path: '/Reporting/dashboard',
  },
  {
    eyebrow: 'Invoices',
    description:
      "View every customer's invoices with no restrictions, so you can update invoice status and add tracking details.",
    label: 'View all invoices',
    path: '/Reporting/invoices',
  },
  {
    eyebrow: 'Products',
    description:
      'See volumes sold and revenue per product to decide what to promote, restock or make.',
    label: 'Product sales',
    path: '/Reporting/products',
  },
  {
    eyebrow: 'Users',
    description:
      'Review account activity and spot customers who have not logged in for some time.',
    label: 'User activity',
    path: '/Reporting/users',
  },
  {
    eyebrow: 'Blog',
    description: 'See which posts get read, commented on and reacted to.',
    label: 'Blog stats',
    path: '/Reporting/blog',
  },
];

export default function ReportingPage() {
  const navigate = useNavigate();

  return (
    <Box gap="large" pad="xsmall">
      <Box gap="xxsmall">
        <Text style={eyebrow}>Admin</Text>
        <Text
          as="h1"
          margin="none"
          style={{
            fontFamily: ui.serif,
            fontSize: '36px',
            fontWeight: 400,
            color: ui.ink,
          }}
        >
          Reporting
        </Text>
      </Box>

      <Box gap="medium">
        <Text style={eyebrow}>Reports</Text>
        <Box direction="row" wrap style={{ gap: 24 }}>
          {REPORTS.map((report) => (
            <Box
              key={report.path}
              gap="small"
              pad="medium"
              background="white"
              style={{
                border: `1px solid ${ui.line}`,
                borderRadius: '2px',
                width: '320px',
                maxWidth: '100%',
              }}
            >
              <Text style={eyebrow}>{report.eyebrow}</Text>
              <Text style={{ color: ui.muted }}>{report.description}</Text>
              <Box direction="row" margin={{ top: 'auto' }}>
                <ActionButton
                  label={report.label}
                  onClick={() => navigate(report.path)}
                  fixed
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

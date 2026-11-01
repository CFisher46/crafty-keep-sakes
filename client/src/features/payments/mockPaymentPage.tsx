import { useState } from 'react';
import { Box, Text } from 'grommet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';
import { completeMockPayment } from './paymentsApi';

// Stand-in for Square's hosted checkout page while we have no credentials.
export default function MockPaymentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ref = params.get('ref');
  const invoice = params.get('invoice');

  const finish = async (outcome: 'succeeded' | 'failed') => {
    if (!ref) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await completeMockPayment(ref, outcome);
      navigate(`/payments/result?invoice=${invoice ?? ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setBusy(false);
    }
  };

  if (!ref) {
    return (
      <Box pad="large" align="center">
        <Text>This payment link is not valid.</Text>
      </Box>
    );
  }

  return (
    <Box align="center" pad="medium">
      <Box width="medium" border={{ color: ui.line }} background="white" pad="large" gap="medium">
        <Box gap="xxsmall">
          <Text style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.muted }}>
            Test payment page
          </Text>
          <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '28px', fontWeight: 400, color: ui.ink }}>
            Pay for your order
          </Text>
        </Box>
        <Text size="small" style={{ color: ui.muted }}>
          This simulates the payment vendor's hosted page. No card details are collected and no money is taken.
          {invoice ? ` Invoice reference: ${invoice}.` : ''}
        </Text>
        {error && (
          <Text role="alert" size="small" color="status-critical">
            {error}
          </Text>
        )}
        <Box gap="small">
          <ActionButton label="Pay now (simulate success)" onClick={() => finish('succeeded')} disabled={busy} />
          <ActionButton label="Simulate a failed payment" secondary onClick={() => finish('failed')} disabled={busy} />
          <ActionButton
            label="Cancel and go back"
            secondary
            onClick={() => navigate(`/payments/result?invoice=${invoice ?? ''}`)}
            disabled={busy}
          />
        </Box>
      </Box>
    </Box>
  );
}

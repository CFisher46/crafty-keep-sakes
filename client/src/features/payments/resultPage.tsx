import { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'grommet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';
import { fetchPaymentStatus, PaymentStatus, startPayment } from './paymentsApi';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 5;

// The vendor's confirmation reaches us by webhook, which can land a moment after the redirect back,
// so keep checking briefly while the invoice is still unpaid.
export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invoiceId = params.get('invoice');

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const next = await fetchPaymentStatus(invoiceId);
          if (!cancelled) {
            setStatus(next);
            setError(null);
            setPolls((count) => count + 1);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not check payment');
          }
        }
      },
      polls === 0 ? 0 : POLL_INTERVAL_MS
    );

    const settled = status && (status.invoice_status !== 'unpaid' || status.payment_status === 'failed');
    if (settled || polls >= MAX_POLLS) {
      clearTimeout(timer);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [invoiceId, polls, status]);

  const tryAgain = useCallback(async () => {
    if (!invoiceId) {
      return;
    }
    setRetrying(true);
    try {
      const { payment_url } = await startPayment(invoiceId);
      window.location.assign(payment_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment');
      setRetrying(false);
    }
  }, [invoiceId]);

  const checking = !!status && status.invoice_status === 'unpaid' && status.payment_status !== 'failed' && polls < MAX_POLLS;

  let title = 'Checking your payment';
  let message = 'One moment while we confirm your payment.';

  if (!invoiceId || error) {
    title = 'We could not check your payment';
    message = error || 'This page needs an invoice reference.';
  } else if (status?.invoice_status === 'paid') {
    title = 'Payment received';
    message = `Thank you! Invoice ${status.invoice_number} is paid and your order is confirmed.`;
  } else if (status?.payment_status === 'failed') {
    title = 'Payment unsuccessful';
    message = `Your payment for invoice ${status.invoice_number} did not go through. You have not been charged.`;
  } else if (status && !checking) {
    title = 'Awaiting payment';
    message = `We cannot confirm payment for invoice ${status.invoice_number} yet. If you have already paid, please check your invoice later or contact us before paying again.`;
  }

  const canRetry = status?.invoice_status === 'unpaid' && !checking && !error;

  return (
    <Box align="center" pad="medium">
      <Box width="medium" border={{ color: ui.line }} background="white" pad="large" gap="medium">
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '28px', fontWeight: 400, color: ui.ink }}>
          {title}
        </Text>
        <Text size="small" style={{ color: ui.muted }}>
          {message}
        </Text>
        <Box gap="small">
          {invoiceId && (
            <ActionButton
              label="View my invoice"
              secondary={canRetry}
              onClick={() => navigate(`/invoices?invoice=${invoiceId}`)}
            />
          )}
          {canRetry && <ActionButton label="Try payment again" onClick={tryAgain} disabled={retrying} />}
        </Box>
      </Box>
    </Box>
  );
}

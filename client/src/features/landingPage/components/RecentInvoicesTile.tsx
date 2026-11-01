import React, { useEffect, useState } from 'react';
import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../store/hooks';
import { fetchAllOrders, fetchOrderHistory } from '../../../store/basket/basketThunks';
import { InvoiceOrder } from '../../../types';
import { ui } from '../../../helpers/theme';

const MAX_ITEMS = 5;

interface RecentInvoicesTileProps {
  isAdmin: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
};

const sortKey = (order: InvoiceOrder) =>
  new Date(order.invoice_updated_at || order.placed_at || 0).getTime();

export const RecentInvoicesTile: React.FC<RecentInvoicesTileProps> = ({ isAdmin }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const invoicesPath = isAdmin ? '/Reporting/invoices' : '/invoices';

  useEffect(() => {
    let active = true;
    const thunk = isAdmin ? fetchAllOrders : fetchOrderHistory;

    dispatch(thunk()).then((result) => {
      if (!active) return;
      if (thunk.fulfilled.match(result)) {
        setInvoices(
          result.payload
            .filter((order) => order.has_changes)
            .sort((a, b) => sortKey(b) - sortKey(a))
            .slice(0, MAX_ITEMS)
        );
      }
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [dispatch, isAdmin]);

  return (
    <Box gap="xsmall">
      <Box direction="row" justify="between" align="baseline">
        <Text size="xsmall" weight="bold" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}>
          {isAdmin ? 'New orders' : 'Updated invoices'}
        </Text>
        <button
          type="button"
          onClick={() => navigate(invoicesPath)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: ui.muted, font: 'inherit', fontSize: 12, textDecoration: 'underline' }}
        >
          {isAdmin ? 'All invoices' : 'My invoices'}
        </button>
      </Box>

      {loaded && invoices.length === 0 ? (
        <Text size="small" style={{ color: ui.muted }}>
          You&apos;re all caught up.
        </Text>
      ) : (
        <Box as="ul" margin="none" pad="none" style={{ listStyle: 'none' }}>
          {invoices.map((order) => (
            <li key={order.id} style={{ borderTop: `1px solid ${ui.line}` }}>
              <button
                type="button"
                onClick={() => navigate(`${invoicesPath}?invoice=${order.invoice_id}`)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '8px 2px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: ui.ink,
                  font: 'inherit',
                  fontSize: 13,
                }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>{order.invoice_number ?? `Order ${order.id}`}</strong>
                  {isAdmin && order.customer_name ? ` · ${order.customer_name}` : ''}
                </span>
                <span style={{ color: ui.muted, flexShrink: 0 }}>
                  {formatDate(order.invoice_updated_at || order.placed_at)}
                </span>
              </button>
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default RecentInvoicesTile;

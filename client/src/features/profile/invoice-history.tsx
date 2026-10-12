import { useMemo, useState } from 'react';
import { Box, Select, Text, TextInput } from 'grommet';
import { ui } from '../../helpers/theme';
import { ActionButton } from '../landingPage/components/ActionButton';
import type { InvoiceOrder } from '../../types';

interface InvoiceHistoryProps {
  orders: InvoiceOrder[];
  onOpenInvoice: (invoiceId: string) => void;
}

const cellStyle: React.CSSProperties = {
  padding: '12px',
  whiteSpace: 'nowrap',
  color: ui.ink,
};

const headingStyle: React.CSSProperties = {
  textAlign: 'left',
  width: '20%',
  padding: '12px',
  fontWeight: 500,
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: ui.ink,
};

function InvoiceHistory({ orders, onOpenInvoice }: InvoiceHistoryProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus =
          statusFilter === 'all' || order.order_status === statusFilter;
        const matchesInvoice =
          !invoiceSearch ||
          (order.invoice_number ?? '')
            .toLowerCase()
            .includes(invoiceSearch.toLowerCase());

        return matchesStatus && matchesInvoice;
      }),
    [invoiceSearch, orders, statusFilter]
  );

  const openSelectedInvoice = () => {
    const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId);
    if (selectedOrder) {
      onOpenInvoice(String(selectedOrder.invoice_id ?? selectedOrder.id));
    }
  };

  return (
    <Box border={{ color: ui.line }} pad="medium" gap="small" background="white">
      <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '22px', fontWeight: 400, color: ui.ink }}>
        My Invoices
      </Text>
      {orders.length === 0 ? (
        <Text>No orders yet.</Text>
      ) : (
        <>
          <Box direction="row" gap="small" wrap align="center">
            <Box width="180px">
              <Select
                options={['all', 'placed', 'fulfilled', 'cancelled']}
                value={statusFilter}
                onChange={({ option }) => setStatusFilter(String(option))}
              />
            </Box>
            <Box flex="grow" width="220px">
              <TextInput
                placeholder="Search invoice number"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
              />
            </Box>
            <ActionButton
              label="Open Selected Invoice"
              disabled={selectedOrderId === null}
              onClick={openSelectedInvoice}
              fixed
            />
            <ActionButton
              label="Clear Selection"
              secondary
              disabled={selectedOrderId === null}
              onClick={() => setSelectedOrderId(null)}
              fixed
            />
          </Box>

          {filteredOrders.length === 0 ? (
            <Text>No invoices match the current filter.</Text>
          ) : (
            <Box border={{ color: ui.line }} overflow="auto" style={{ maxHeight: '320px' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '720px',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ background: ui.page, borderBottom: `1px solid ${ui.line}` }}>
                    {['Order', 'Invoice', 'Status', 'Total', 'Date'].map((heading) => (
                      <th key={heading} style={headingStyle}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrderId === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() =>
                          setSelectedOrderId((current) =>
                            current === order.id ? null : order.id
                          )
                        }
                        style={{
                          background: isSelected ? ui.sand : 'transparent',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${ui.line}`,
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(event) => {
                          if (!isSelected) {
                            event.currentTarget.style.background = ui.page;
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (!isSelected) {
                            event.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <td style={cellStyle}>{order.id}</td>
                        <td style={cellStyle}>{order.invoice_number ?? '—'}</td>
                        <td style={cellStyle}>{order.order_status}</td>
                        <td style={cellStyle}>£{Number(order.grand_total).toFixed(2)}</td>
                        <td style={cellStyle}>
                          {new Date(order.placed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default InvoiceHistory;

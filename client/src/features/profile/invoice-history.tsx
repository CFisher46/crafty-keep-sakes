import { useMemo, useState } from 'react';
import { Box, Button, Select, Text, TextInput } from 'grommet';
import { buttonStyles } from '../../helpers/formatting';
import type { InvoiceOrder } from '../../types';

interface InvoiceHistoryProps {
  orders: InvoiceOrder[];
  onOpenInvoice: (invoiceId: string) => void;
}

const cellStyle: React.CSSProperties = {
  padding: '12px',
  whiteSpace: 'nowrap',
  color: '#1F2937',
};

const headingStyle: React.CSSProperties = {
  textAlign: 'left',
  width: '20%',
  padding: '12px',
  fontWeight: 700,
  color: '#1F2937',
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
    <Box
      border
      round="small"
      pad="medium"
      gap="small"
      background="white"
      margin={{ top: 'small' }}
    >
      <Text>My Invoices</Text>
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
            <Button
              label="Open Selected Invoice"
              disabled={selectedOrderId === null}
              onClick={openSelectedInvoice}
              style={buttonStyles.default}
            />
            <Button
              label="Clear Selection"
              disabled={selectedOrderId === null}
              onClick={() => setSelectedOrderId(null)}
              style={buttonStyles.default}
            />
          </Box>

          {filteredOrders.length === 0 ? (
            <Text>No invoices match the current filter.</Text>
          ) : (
            <Box border round="xsmall" overflow="auto" style={{ maxHeight: '320px' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '720px',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ background: '#EEF3FF', borderBottom: '1px solid #C7D7FF' }}>
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
                          background: isSelected ? '#E8F0FE' : 'transparent',
                          cursor: 'pointer',
                          borderBottom: '1px solid #E4E4E4',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(event) => {
                          if (!isSelected) {
                            event.currentTarget.style.background = '#F5F8FF';
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

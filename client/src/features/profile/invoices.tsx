import { useEffect, useState } from 'react';
import { Box, Button, Grid, Layer, Select, Text, TextInput } from 'grommet';
import { buttonStyles } from '../../helpers/formatting';
import {
  DeliveryAddress,
  fetchInvoiceById,
  fetchOrderHistory,
  updateInvoiceStatus,
  updateInvoiceTrackingInfo,
} from '../../store/basket/basketThunks';
import { useAppDispatch } from '../../store/hooks';

interface InvoiceOrder {
  id: number;
  invoice_id?: number | null;
  invoice_number?: string | null;
  order_status: string;
  grand_total: number;
  placed_at: string;
}

interface InvoiceDetails {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_status: string;
  total_due: number;
  issued_at: string;
  user_id: number;
  delivery_address?: DeliveryAddress;
  tracking_info?: string;
  items?: Array<{
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

interface InvoicesProps {
  userId?: string;
  userType?: string;
  billingAddress: DeliveryAddress;
}

function Invoices({ userId, userType, billingAddress }: InvoicesProps) {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceNumberSearch, setInvoiceNumberSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [pendingInvoiceStatus, setPendingInvoiceStatus] = useState('');
  const [invoiceUpdateMessage, setInvoiceUpdateMessage] = useState<string | null>(null);
  const [enableSave, setEnableSave] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      if (!userId) {
        return;
      }

      const result = await dispatch(fetchOrderHistory());
      if (fetchOrderHistory.fulfilled.match(result)) {
        setOrders(result.payload);
      }
    };

    loadOrders();
  }, [dispatch, userId]);

  const refreshOrderHistory = async () => {
    if (!userId) {
      return;
    }

    const result = await dispatch(fetchOrderHistory());
    if (fetchOrderHistory.fulfilled.match(result)) {
      setOrders(result.payload);
    }
  };

  useEffect(() => {
    const loadInvoice = async () => {
      if (!selectedInvoiceId) {
        setInvoice(null);
        setPendingInvoiceStatus('');
        setInvoiceUpdateMessage(null);
        return;
      }

      const result = await dispatch(fetchInvoiceById(selectedInvoiceId));
      if (fetchInvoiceById.fulfilled.match(result)) {
        setInvoice(result.payload);
        setPendingInvoiceStatus(result.payload.invoice_status);
        setInvoiceUpdateMessage(null);
      }
    };

    loadInvoice();
  }, [dispatch, selectedInvoiceId]);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      invoiceStatusFilter === 'all' || order.order_status === invoiceStatusFilter;
    const matchesInvoiceNumber =
      !invoiceNumberSearch ||
      (order.invoice_number ?? '').toLowerCase().includes(invoiceNumberSearch.toLowerCase());

    return matchesStatus && matchesInvoiceNumber;
  });

  const handleOpenSelectedInvoice = () => {
    if (selectedOrderId === null) {
      return;
    }

    const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId);
    if (!selectedOrder) {
      return;
    }

    setSelectedInvoiceId(String(selectedOrder.invoice_id ?? selectedOrder.id));
  };

  const handleCloseInvoice = () => {
    setSelectedInvoiceId('');
    setInvoice(null);
    setPendingInvoiceStatus('');
    setInvoiceUpdateMessage(null);
  };

  const handleInvoiceStatusUpdate = async () => {
    if (!selectedInvoiceId || !pendingInvoiceStatus) {
      return;
    }

    const result = await dispatch(
      updateInvoiceStatus({
        invoiceId: selectedInvoiceId,
        invoiceStatus: pendingInvoiceStatus,
      })
    );

    if (updateInvoiceStatus.fulfilled.match(result)) {
      setInvoiceUpdateMessage('Invoice status updated');
      const refreshed = await dispatch(fetchInvoiceById(selectedInvoiceId));
      if (fetchInvoiceById.fulfilled.match(refreshed)) {
        setInvoice(refreshed.payload);
        setPendingInvoiceStatus(refreshed.payload.invoice_status);
      }
      await refreshOrderHistory();
      return;
    }

    setInvoiceUpdateMessage('Unable to update invoice status');
  };

  const handleInvoiceTrackingInfoUpdate = async () => {
    if (!selectedInvoiceId) {
      return;
    }

    const result = await dispatch(
      updateInvoiceTrackingInfo({
        invoiceId: selectedInvoiceId,
        trackingInfo,
      })
    );

    if (updateInvoiceTrackingInfo.fulfilled.match(result)) {
      setInvoiceUpdateMessage('Invoice tracking info updated');
      console.log('Invoice tracking info update successful');
      const refreshed = await dispatch(fetchInvoiceById(selectedInvoiceId));
      if (fetchInvoiceById.fulfilled.match(refreshed)) {
        setInvoice(refreshed.payload);
      }
      await refreshOrderHistory();
      return;
    }

    setInvoiceUpdateMessage('Unable to update invoice tracking info');
    console.log('Invoice tracking info update failed');
  };

  return (
    <>
      {invoice && (
        <Layer
          position="center"
          onEsc={handleCloseInvoice}
          onClickOutside={handleCloseInvoice}
          modal
        >
          <Box pad="medium" width="large" gap="small">
            <Box direction="row" justify="between" align="center">
              <Text weight="bold">Invoice id: {invoice.invoice_number}</Text>
              <Button label="Close" onClick={handleCloseInvoice} style={buttonStyles.default} />
            </Box>

            <Box direction="row" align="center" gap="xsmall">
              <Text weight="bold">Total Due:</Text>
              <Text>£{Number(invoice.total_due).toFixed(2)}</Text>
            </Box>

            <Box direction="row" align="center" gap="xsmall">
              <Text weight="bold">Status:</Text>
              <Text>{invoice.invoice_status}</Text>
            </Box>

            <Box direction="row" align="center" gap="xsmall">
              <Text weight="bold">Issued:</Text>
              <Text>{new Date(invoice.issued_at).toLocaleString()}</Text>
            </Box>

            <Box margin={{ top: 'small' }} direction="row" align="center">
              <Box width="120px">
                <Text weight="bold">Tracking Info:</Text>
              </Box>
              <TextInput
                placeholder={invoice.tracking_info || 'No Tracking Available'}
                disabled={userType !== 'admin'}
                width="medium"
                onChange={(event) => {
                  setEnableSave(true);
                  setTrackingInfo(event.target.value);
                }}
              />
            </Box>

            <Grid columns={['medium', 'medium']} gap="xsmall">
              {invoice.delivery_address && (
                <Box margin={{ top: 'xsmall' }} pad="xsmall" round="xsmall" width="300px">
                  <Text weight="bold">Delivery address</Text>
                  <Text>{invoice.delivery_address.address_line1 || '—'}</Text>
                  {invoice.delivery_address.address_line2 && <Text>{invoice.delivery_address.address_line2}</Text>}
                  {invoice.delivery_address.address_line3 && <Text>{invoice.delivery_address.address_line3}</Text>}
                  <Text>
                    {[invoice.delivery_address.town, invoice.delivery_address.county]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </Text>
                  <Text>{invoice.delivery_address.postcode || '—'}</Text>
                </Box>
              )}

              {billingAddress.address_line1 && (
                <Box margin={{ top: 'xsmall' }} pad="xsmall" round="xsmall" width="300px">
                  <Text weight="bold">Billing address</Text>
                  <Text>{billingAddress.address_line1 || '—'}</Text>
                  {billingAddress.address_line2 && <Text>{billingAddress.address_line2}</Text>}
                  {billingAddress.address_line3 && <Text>{billingAddress.address_line3}</Text>}
                  <Text>
                    {[billingAddress.town, billingAddress.county].filter(Boolean).join(', ') || '—'}
                  </Text>
                  <Text>{billingAddress.postcode || '—'}</Text>
                </Box>
              )}
            </Grid>

            <Grid>
              {invoice.items && invoice.items.length > 0 && (
                <Box margin={{ top: 'small' }} gap="xsmall">
                  <Text weight="bold">Items</Text>
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
                        <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Description</th>
                        <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Quantity</th>
                        <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Unit Price</th>
                        <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Total</th>
                      </tr>
                    </thead>
                    {invoice.items.map((item) => (
                      <tbody key={item.id}>
                        <tr style={{ borderBottom: '1px solid #C7D7FF' }}>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{item.description}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{item.quantity}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>£{Number(item.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>£{Number(item.line_total).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    ))}
                  </table>
                </Box>
              )}
            </Grid>

            {(userType === 'admin' || userType === 'Admin') && (
              <Box margin={{ top: 'small' }} gap="xsmall">
                <Select
                  options={['unpaid', 'paid', 'void']}
                  value={pendingInvoiceStatus || invoice.invoice_status}
                  onChange={({ option }) => setPendingInvoiceStatus(option)}
                />
                <Button
                  label="Confirm Update"
                  disabled={!pendingInvoiceStatus || pendingInvoiceStatus === invoice.invoice_status}
                  onClick={handleInvoiceStatusUpdate}
                  style={buttonStyles.default}
                />
                <Button
                  label="Update Tracking Info"
                  disabled={!enableSave}
                  onClick={handleInvoiceTrackingInfoUpdate}
                  style={buttonStyles.default}
                />
                {invoiceUpdateMessage && <Text>{invoiceUpdateMessage}</Text>}
              </Box>
            )}
          </Box>
        </Layer>
      )}

      <Box border round="small" pad="medium" gap="small" background="white" margin={{ top: 'small' }}>
        <Text>My Invoices</Text>
        {orders.length === 0 ? (
          <Text>No orders yet.</Text>
        ) : (
          <Box gap="small">
            <Box direction="row" gap="small" wrap align="center">
              <Box width="180px">
                <Select
                  options={['all', 'placed', 'fulfilled', 'cancelled']}
                  value={invoiceStatusFilter}
                  onChange={({ option }) => setInvoiceStatusFilter(String(option))}
                />
              </Box>
              <Box flex="grow" width="220px">
                <TextInput
                  placeholder="Search invoice number"
                  value={invoiceNumberSearch}
                  onChange={(event) => setInvoiceNumberSearch(event.target.value)}
                />
              </Box>
              <Button
                label="Open Selected Invoice"
                disabled={selectedOrderId === null}
                onClick={handleOpenSelectedInvoice}
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
                      <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Order</th>
                      <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Invoice</th>
                      <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Status</th>
                      <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Total</th>
                      <th style={{ textAlign: 'left', width: '20%', padding: '12px 12px', fontWeight: 700, color: '#1F2937' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;

                      return (
                        <tr
                          key={order.id}
                          onClick={() =>
                            setSelectedOrderId((current) => current === order.id ? null : order.id)
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
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{order.id}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{order.invoice_number ?? '—'}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{order.order_status}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>£{Number(order.grand_total).toFixed(2)}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1F2937' }}>{new Date(order.placed_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  );
}

export default Invoices;

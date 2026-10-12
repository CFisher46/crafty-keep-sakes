import { useEffect, useState } from 'react';
import { Box, Layer, Select, Text, TextInput } from 'grommet';
import { ui } from '../../helpers/theme';
import { ActionButton } from '../landingPage/components/ActionButton';
import type { DeliveryAddress, InvoiceDetails } from '../../types';

interface InvoiceDetailsProps {
  invoice: InvoiceDetails;
  billingAddress: DeliveryAddress;
  userType?: string;
  updateMessage: string | null;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateTracking: (trackingInfo: string) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: ui.muted,
};

const AddressBlock = ({ title, address }: { title: string; address: DeliveryAddress }) => (
  <Box gap="xxsmall">
    <Text style={labelStyle}>{title}</Text>
    <Text>{address.address_line1 || '—'}</Text>
    {address.address_line2 && <Text>{address.address_line2}</Text>}
    {address.address_line3 && <Text>{address.address_line3}</Text>}
    <Text>{[address.town, address.county].filter(Boolean).join(', ') || '—'}</Text>
    <Text>{address.postcode || '—'}</Text>
  </Box>
);

const Meta = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box gap="xxsmall">
    <Text style={labelStyle}>{label}</Text>
    <Text style={{ color: ui.ink }}>{children}</Text>
  </Box>
);

function InvoiceDetailsDialog({
  invoice,
  billingAddress,
  userType,
  updateMessage,
  onClose,
  onUpdateStatus,
  onUpdateTracking,
}: InvoiceDetailsProps) {
  const [pendingStatus, setPendingStatus] = useState(invoice.invoice_status);
  const [trackingInfo, setTrackingInfo] = useState(invoice.tracking_info ?? '');

  useEffect(() => {
    setPendingStatus(invoice.invoice_status);
    setTrackingInfo(invoice.tracking_info ?? '');
  }, [invoice.id, invoice.invoice_status, invoice.tracking_info]);

  const isAdmin = userType?.toLowerCase() === 'admin';

  return (
    <Layer position="center" onEsc={onClose} onClickOutside={onClose} modal responsive={false} style={{ borderRadius: 0 }}>
      <Box width={{ width: '100%', max: '760px' }} background="white" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <Box direction="row" justify="between" align="start" pad="medium" gap="medium" border={{ side: 'bottom', color: ui.line }}>
          <Box gap="xxsmall">
            <Text style={{ ...labelStyle, letterSpacing: '0.18em' }}>Invoice</Text>
            <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '26px', fontWeight: 400, color: ui.ink }}>
              Invoice id: {invoice.invoice_number}
            </Text>
          </Box>
          <ActionButton label="Close" onClick={onClose} secondary fixed />
        </Box>

        <Box pad="medium" gap="medium">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <Meta label="Status">
              <span style={{ background: ui.sand, padding: '3px 10px', fontSize: 13, textTransform: 'capitalize' }}>
                {invoice.invoice_status}
              </span>
            </Meta>
            <Meta label="Issued">{new Date(invoice.issued_at).toLocaleDateString()}</Meta>
            <Meta label="Total due">£{Number(invoice.total_due).toFixed(2)}</Meta>
          </div>

          <Box gap="xxsmall">
            <Text style={labelStyle}>Tracking info</Text>
            <TextInput
              value={trackingInfo}
              placeholder="No Tracking Available"
              disabled={!isAdmin}
              style={{ borderRadius: 0, fontWeight: 400 }}
              onChange={(event) => setTrackingInfo(event.target.value)}
            />
          </Box>

          {(invoice.delivery_address || billingAddress.address_line1) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, paddingTop: 16, borderTop: `1px solid ${ui.line}` }}>
              {invoice.delivery_address && (
                <AddressBlock title="Delivery address" address={invoice.delivery_address} />
              )}
              {billingAddress.address_line1 && (
                <AddressBlock title="Billing address" address={billingAddress} />
              )}
            </div>
          )}

          {invoice.items && invoice.items.length > 0 && (
            <Box gap="xsmall">
              <Text style={labelStyle}>Items</Text>
              <Box border={{ color: ui.line }} overflow="auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: ui.page, borderBottom: `1px solid ${ui.line}` }}>
                      {['Description', 'Quantity', 'Unit Price', 'Total'].map((heading, index) => (
                        <th
                          key={heading}
                          style={{
                            ...labelStyle,
                            textAlign: index === 0 ? 'left' : 'right',
                            padding: '10px 12px',
                            fontWeight: 500,
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${ui.line}` }}>
                        <td style={itemCellStyle}>{item.description}</td>
                        <td style={{ ...itemCellStyle, textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ ...itemCellStyle, textAlign: 'right' }}>£{Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ ...itemCellStyle, textAlign: 'right' }}>£{Number(item.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}

          {isAdmin && (
            <Box gap="small" pad="medium" background={ui.page} border={{ color: ui.line }}>
              <Text style={labelStyle}>Manage invoice</Text>
              <Select
                options={['unpaid', 'paid', 'void']}
                value={pendingStatus}
                onChange={({ option }) => setPendingStatus(option)}
              />
              <Box direction="row" gap="small" wrap>
                <ActionButton
                  label="Confirm Update"
                  disabled={!pendingStatus || pendingStatus === invoice.invoice_status}
                  onClick={() => onUpdateStatus(pendingStatus)}
                />
                <ActionButton
                  label="Update Tracking Info"
                  secondary
                  disabled={trackingInfo === (invoice.tracking_info ?? '')}
                  onClick={() => onUpdateTracking(trackingInfo)}
                />
              </Box>
              {updateMessage && <Text>{updateMessage}</Text>}
            </Box>
          )}
        </Box>
      </Box>
    </Layer>
  );
}

const itemCellStyle: React.CSSProperties = {
  padding: '12px',
  whiteSpace: 'nowrap',
  color: ui.ink,
};

export default InvoiceDetailsDialog;

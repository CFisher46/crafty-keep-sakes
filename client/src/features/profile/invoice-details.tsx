import { useEffect, useState } from 'react';
import { Box, Button, Grid, Layer, Select, Text, TextInput } from 'grommet';
import { buttonStyles } from '../../helpers/formatting';
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

const addressLines = (address: DeliveryAddress) => (
  <>
    <Text>{address.address_line1 || '—'}</Text>
    {address.address_line2 && <Text>{address.address_line2}</Text>}
    {address.address_line3 && <Text>{address.address_line3}</Text>}
    <Text>{[address.town, address.county].filter(Boolean).join(', ') || '—'}</Text>
    <Text>{address.postcode || '—'}</Text>
  </>
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
    <Layer position="center" onEsc={onClose} onClickOutside={onClose} modal>
      <Box pad="medium" width="large" gap="small">
        <Box direction="row" justify="between" align="center">
          <Text weight="bold">Invoice id: {invoice.invoice_number}</Text>
          <Button label="Close" onClick={onClose} style={buttonStyles.default} />
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
            value={trackingInfo}
            placeholder="No Tracking Available"
            disabled={!isAdmin}
            width="medium"
            onChange={(event) => setTrackingInfo(event.target.value)}
          />
        </Box>

        <Grid columns={['medium', 'medium']} gap="xsmall">
          {invoice.delivery_address && (
            <Box margin={{ top: 'xsmall' }} pad="xsmall" round="xsmall" width="300px">
              <Text weight="bold">Delivery address</Text>
              {addressLines(invoice.delivery_address)}
            </Box>
          )}
          {billingAddress.address_line1 && (
            <Box margin={{ top: 'xsmall' }} pad="xsmall" round="xsmall" width="300px">
              <Text weight="bold">Billing address</Text>
              {addressLines(billingAddress)}
            </Box>
          )}
        </Grid>

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
                  {['Description', 'Quantity', 'Unit Price', 'Total'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        width: '20%',
                        padding: '12px',
                        fontWeight: 700,
                        color: '#1F2937',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #C7D7FF' }}>
                    <td style={itemCellStyle}>{item.description}</td>
                    <td style={itemCellStyle}>{item.quantity}</td>
                    <td style={itemCellStyle}>£{Number(item.unit_price).toFixed(2)}</td>
                    <td style={itemCellStyle}>£{Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        {isAdmin && (
          <Box margin={{ top: 'small' }} gap="xsmall">
            <Select
              options={['unpaid', 'paid', 'void']}
              value={pendingStatus}
              onChange={({ option }) => setPendingStatus(option)}
            />
            <Button
              label="Confirm Update"
              disabled={!pendingStatus || pendingStatus === invoice.invoice_status}
              onClick={() => onUpdateStatus(pendingStatus)}
              style={buttonStyles.default}
            />
            <Button
              label="Update Tracking Info"
              disabled={trackingInfo === (invoice.tracking_info ?? '')}
              onClick={() => onUpdateTracking(trackingInfo)}
              style={buttonStyles.default}
            />
            {updateMessage && <Text>{updateMessage}</Text>}
          </Box>
        )}
      </Box>
    </Layer>
  );
}

const itemCellStyle: React.CSSProperties = {
  padding: '12px',
  whiteSpace: 'nowrap',
  color: '#1F2937',
};

export default InvoiceDetailsDialog;

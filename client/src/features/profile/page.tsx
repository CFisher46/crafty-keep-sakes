import { Text, Form, Box, TextInput, Grid, Button, Select, Layer } from 'grommet';
import { View, Hide } from 'grommet-icons';
import { useEffect, useState } from 'react';
import { fetchUserById, updateUser } from '../../store/users/usersThunks';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { useParams } from 'react-router-dom';
import {
  fetchInvoiceById,
  fetchOrderHistory,
  updateInvoiceStatus,
} from '../../store/basket/basketThunks';

//import { buttonStyles } from '../../helpers/styles';

interface InputFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  onChange: (value: string) => void;
  type?: string;
  toggleVisibility?: () => void;
  isPassword?: boolean;
  isVisible?: boolean;
}

const InputField = ({
  label,
  value,
  placeholder,
  inputStyle,
  labelStyle,
  onChange,
  type = 'text',
  toggleVisibility,
  isPassword = false,
  isVisible = false,
}: InputFieldProps) => (
  <Box direction="row" gap="small" align="center">
    <Text style={labelStyle}>{label}</Text>
    <TextInput
      style={inputStyle}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      type={type}
    />
    {isPassword && toggleVisibility && (
      <Button
        icon={isVisible ? <Hide /> : <View />}
        onClick={toggleVisibility}
      />
    )}
  </Box>
);

function UsersProfile() {
  console.log(' Navigated to /Profile');
  const { id: userId } = useParams<{ id: string }>(); // Extract userId from URL
  const dispatch = useAppDispatch();
  const selectedUser = useSelector(
    (state: RootState) => state.users.selectedUser
  );

  const [userData, setUserData] = useState({
    id: '',
    email_address: '',
    first_name: '',
    last_name: '',
    address_line1: '',
    address_line2: '',
    address_line3: '',
    town: '',
    county: '',
    postcode: '',
    telephone_number: '',
    type: '',
    new_password: '',
    confirm_new_password: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  //Removed setPasswordError for linting
  const [passwordError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orders, setOrders] = useState<Array<{ id: number; invoice_id?: number | null; invoice_number?: string | null; order_status: string; grand_total: number; placed_at: string }>>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [invoice, setInvoice] = useState<null | {
    id: number;
    order_id: number;
    invoice_number: string;
    invoice_status: string;
    total_due: number;
    issued_at: string;
    user_id: number;
    billing_address?: {
      address_line1: string;
      address_line2: string;
      address_line3: string;
      town: string;
      county: string;
      postcode: string;
    };
    items?: Array<{
      id: number;
      description: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }>(null);
  const [pendingInvoiceStatus, setPendingInvoiceStatus] = useState<string>('');
  const [invoiceUpdateMessage, setInvoiceUpdateMessage] = useState<string | null>(null);

  const inputStyle = { width: '100%' };
  const labelStyle = { width: '100%', textAlign: 'left' as 'left' };

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserById(userId));
    } else {
      console.error('User ID is undefined');
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (selectedUser) {
      setUserData((prev) => ({
        ...prev,
        ...selectedUser,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

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

  const handleFieldChange = (field: string, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleOpenInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleOpenSelectedInvoice = () => {
    if (selectedOrderId === null) {
      return;
    }

    const selectedOrder = orders.find((order) => order.id === selectedOrderId);
    if (!selectedOrder) {
      return;
    }

    handleOpenInvoice(String(selectedOrder.invoice_id ?? selectedOrder.id));
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

  const handleSaveProfile = async () => {
    if (!userData.id) {
      setSaveMessage('No profile loaded');
      return;
    }

    const profileUpdate = {
      email_address: userData.email_address,
      first_name: userData.first_name,
      last_name: userData.last_name,
      address_line1: userData.address_line1,
      address_line2: userData.address_line2,
      address_line3: userData.address_line3,
      town: userData.town,
      county: userData.county,
      postcode: userData.postcode,
      telephone_number: userData.telephone_number,
    };

    try {
      await dispatch(
        updateUser({
          id: userData.id,
          user: profileUpdate,
          previousUser: selectedUser ?? undefined,
        })
      ).unwrap();

      setSaveMessage('Profile saved');
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : 'Failed to save profile'
      );
    }
  };

  return (
    <Form>
      <Box gap="small">
        {invoice && (
          <Layer
            position="center"
            onEsc={handleCloseInvoice}
            onClickOutside={handleCloseInvoice}
            modal
          >
            <Box pad="medium" width="large" gap="small">
              <Box direction="row" justify="between" align="center">
                <Text>Invoice #{invoice.invoice_number}</Text>
                <Button label="Close" secondary onClick={handleCloseInvoice} />
              </Box>
              <Text>Status: {invoice.invoice_status}</Text>
              <Text>Total Due: £{Number(invoice.total_due).toFixed(2)}</Text>
              <Text>Issued: {new Date(invoice.issued_at).toLocaleString()}</Text>
              {invoice.billing_address && (
                <Box margin={{ top: 'xsmall' }} pad="xsmall" border round="xsmall">
                  <Text weight="bold">Billing address</Text>
                  <Text>{invoice.billing_address.address_line1 || '—'}</Text>
                  {invoice.billing_address.address_line2 && <Text>{invoice.billing_address.address_line2}</Text>}
                  {invoice.billing_address.address_line3 && <Text>{invoice.billing_address.address_line3}</Text>}
                  <Text>{[invoice.billing_address.town, invoice.billing_address.county].filter(Boolean).join(', ') || '—'}</Text>
                  <Text>{invoice.billing_address.postcode || '—'}</Text>
                </Box>
              )}

              {invoice.items && invoice.items.length > 0 && (
                <Box margin={{ top: 'small' }} gap="xsmall">
                  <Text weight="bold">Items</Text>
                  {invoice.items.map((item) => (
                    <Box key={item.id} border pad="xsmall" round="xsmall">
                      <Text>{item.description}</Text>
                      <Text>Qty: {item.quantity}</Text>
                      <Text>Unit: £{Number(item.unit_price).toFixed(2)}</Text>
                      <Text>Total: £{Number(item.line_total).toFixed(2)}</Text>
                    </Box>
                  ))}
                </Box>
              )}

              {(selectedUser?.type === 'admin' || selectedUser?.type === 'Admin') && (
                <Box margin={{ top: 'small' }} gap="xsmall">
                  <Select
                    options={['unpaid', 'paid', 'void']}
                    value={pendingInvoiceStatus || invoice.invoice_status}
                    onChange={({ option }) => setPendingInvoiceStatus(option)}
                  />
                  <Button
                    label="Confirm Update"
                    primary
                    disabled={!pendingInvoiceStatus || pendingInvoiceStatus === invoice.invoice_status}
                    onClick={handleInvoiceStatusUpdate}
                  />
                  {invoiceUpdateMessage && <Text>{invoiceUpdateMessage}</Text>}
                </Box>
              )}
            </Box>
          </Layer>
        )}

        <Grid columns={['450px', '400px', '420px']} gap="small">
          <Box border round="small" pad="medium" gap="small" background="white">
            {[
              { label: 'UserName', field: 'email_address' },
              { label: 'FirstName', field: 'first_name' },
              { label: 'LastName', field: 'last_name' },
              { label: 'Address Line1', field: 'address_line1' },
              { label: 'Address Line2', field: 'address_line2' },
              { label: 'Address Line3', field: 'address_line3' },
              { label: 'Town', field: 'town' },
              { label: 'County', field: 'county' },
              { label: 'PostCode', field: 'postcode' },
            ].map(({ label, field }) => (
              <InputField
                key={label}
                label={label}
                placeholder={userData[field as keyof typeof userData] || ''}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) => handleFieldChange(field, value)}
                value={userData[field as keyof typeof userData] || ''}
              />
            ))}
          </Box>

          <Box direction="column" gap="small">
            <Box border round="small" pad="medium" gap="small" background="white">
              <Text style={labelStyle}>Reset Password</Text>
              <InputField
                label="Current Password"
                value={currentPassword}
                placeholder="Enter current password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={setCurrentPassword}
                type="password"
              />
              <Button
                label="Verify Password"
                // Add password verification logic here
              />
              {passwordError && (
                <Text color="status-critical">{passwordError}</Text>
              )}
              <InputField
                label="New Password"
                value={userData.new_password || ''}
                placeholder="Enter new password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) => handleFieldChange('new_password', value)}
                type={showNewPassword ? 'text' : 'password'}
                isPassword
                toggleVisibility={() => setShowNewPassword((prev) => !prev)}
                isVisible={showNewPassword}
              />
              <InputField
                label="Confirm Password"
                value={userData.confirm_new_password || ''}
                placeholder="Confirm new password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) =>
                  handleFieldChange('confirm_new_password', value)
                }
                type={showConfirmPassword ? 'text' : 'password'}
                isPassword
                toggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                isVisible={showConfirmPassword}
              />
            </Box>
            <Box border round="small" pad="medium" gap="small" background="white">
              <Button label="Save Profile" onClick={handleSaveProfile} />
              {saveMessage && <Text>{saveMessage}</Text>}
            </Box>
          </Box>
        </Grid>

        <Box border round="small" pad="medium" gap="small" background="white" margin={{ top: 'small' }}>
          <Text style={labelStyle}>My Orders</Text>
          {orders.length === 0 ? (
            <Text>No orders yet.</Text>
          ) : (
            <Box gap="small">
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
                    {orders.map((order) => {
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
              <Box direction="row" gap="small">
                <Button
                  label="Open Selected Invoice"
                  secondary
                  disabled={selectedOrderId === null}
                  onClick={handleOpenSelectedInvoice}
                />
                <Button
                  label="Clear Selection"
                  plain
                  disabled={selectedOrderId === null}
                  onClick={() => setSelectedOrderId(null)}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Form>
  );
}

export default UsersProfile;

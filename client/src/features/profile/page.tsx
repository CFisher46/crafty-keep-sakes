import { Text, Form, Box, TextInput, Button } from 'grommet';
import { View, Hide } from 'grommet-icons';
import { useEffect, useState } from 'react';
import {
  fetchUserById,
  updateUser,
  verifyCurrentPassword,
} from '../../store/users/usersThunks';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { useParams } from 'react-router-dom';
import { ui } from '../../helpers/theme';
import { ActionButton } from '../landingPage/components/ActionButton';
import Invoices from './invoices';

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
  disabled?: boolean;
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
  disabled,
}: InputFieldProps) => (
  <Box gap="xxsmall">
    <Text style={labelStyle}>{label}</Text>
    <Box direction="row" gap="xsmall" align="center">
      <TextInput
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        disabled={disabled}
      />
      {isPassword && toggleVisibility && (
        <Button
          a11yTitle={isVisible ? 'Hide password' : 'Show password'}
          icon={isVisible ? <Hide /> : <View />}
          onClick={toggleVisibility}
          plain
          style={{ padding: 10, border: `1px solid ${ui.line}`, background: ui.page }}
        />
      )}
    </Box>
  </Box>
);

const panelProps = {
  background: 'white',
  pad: 'medium',
  gap: 'small',
  border: { color: ui.line },
} as const;

const PanelTitle = ({ children }: { children: string }) => (
  <Text
    as="h2"
    margin="none"
    style={{ fontFamily: ui.serif, fontSize: '22px', fontWeight: 400, color: ui.ink }}
  >
    {children}
  </Text>
);

function UsersProfile() {
  console.log(' Navigated to /Profile');
  const { id: userId } = useParams<{ id: string }>();
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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordVerifiedMessage, setPasswordVerifiedMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputStyle = { width: '100%', borderRadius: 0, fontWeight: 400 };
  const labelStyle = {
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: ui.muted,
  };

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

  const handleFieldChange = (field: string, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!userData.id || !currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      setPasswordVerified(false);
      setPasswordVerifiedMessage(null);
      return;
    }

    try {
      const isValid = await verifyCurrentPassword(userData.id, currentPassword);
      if (!isValid) {
        setPasswordError('Current password is incorrect.');
        setPasswordVerified(false);
        setPasswordVerifiedMessage(null);
        return;
      }

      setPasswordError(null);
      setPasswordVerified(true);
      setPasswordVerifiedMessage('Current password verified.');
    } catch (error) {
      setPasswordVerified(false);
      setPasswordVerifiedMessage(null);
      setPasswordError(
        error instanceof Error ? error.message : 'Unable to verify password'
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!userData.id) {
      setSaveMessage('No profile loaded');
      return;
    }

    const hasPasswordChange = Boolean(userData.new_password || userData.confirm_new_password);

    if (hasPasswordChange) {
      if (!passwordVerified) {
        setPasswordError('Please verify your current password before changing it.');
        return;
      }

      if (userData.new_password !== userData.confirm_new_password) {
        setPasswordError('New password and confirm password do not match.');
        return;
      }

      if (!userData.new_password || userData.new_password.trim().length < 8) {
        setPasswordError('New password must be at least 8 characters long.');
        return;
      }
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

    const payload = hasPasswordChange
      ? { ...profileUpdate, password: userData.new_password }
      : profileUpdate;

    try {
      await dispatch(
        updateUser({
          id: userData.id,
          user: payload,
          previousUser: selectedUser ?? undefined,
        })
      ).unwrap();

      setPasswordError(null);
      setPasswordVerified(false);
      setCurrentPassword('');
      setUserData((prev) => ({
        ...prev,
        new_password: '',
        confirm_new_password: '',
      }));
      setSaveMessage('Profile saved');
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : 'Failed to save profile'
      );
    }
  };

  const detailFields = [
    { label: 'UserName', field: 'email_address', wide: true },
    { label: 'FirstName', field: 'first_name' },
    { label: 'LastName', field: 'last_name' },
    { label: 'Address Line1', field: 'address_line1', wide: true },
    { label: 'Address Line2', field: 'address_line2', wide: true },
    { label: 'Address Line3', field: 'address_line3', wide: true },
    { label: 'Town', field: 'town' },
    { label: 'County', field: 'county' },
    { label: 'PostCode', field: 'postcode' },
  ];

  return (
    <Form>
      <Box gap="medium" pad={{ vertical: 'medium' }} width={{ width: '100%', max: '1100px' }} margin="0 auto">
        <Box gap="xxsmall">
          <Text size="small" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', color: ui.muted }}>
            Your account
          </Text>
          <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
            Profile
          </Text>
        </Box>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
          <Box {...panelProps}>
            <PanelTitle>Your details</PanelTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {detailFields.map(({ label, field, wide }) => (
                <div key={label} style={{ gridColumn: wide ? '1 / -1' : undefined }}>
                  <InputField
                    label={label}
                    placeholder={userData[field as keyof typeof userData] || ''}
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                    onChange={(value) => handleFieldChange(field, value)}
                    value={userData[field as keyof typeof userData] || ''}
                  />
                </div>
              ))}
            </div>
          </Box>

          <Box gap="medium">
            <Box {...panelProps}>
              <PanelTitle>Reset Password</PanelTitle>
              <InputField
                label="Current Password"
                value={currentPassword}
                placeholder="Enter current password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) => {
                  setCurrentPassword(value);
                  setPasswordVerified(false);
                  setPasswordVerifiedMessage(null);
                  setPasswordError(null);
                }}
                type="password"
              />
              <Box alignSelf="start">
                <ActionButton
                  label="Verify Password"
                  secondary
                  onClick={handleVerifyCurrentPassword}
                  disabled={!currentPassword.trim()}
                  fixed
                />
              </Box>
              {passwordVerifiedMessage && (
                <Text color="status-ok">{passwordVerifiedMessage}</Text>
              )}
              {passwordError && (
                <Text color="status-critical">{passwordError}</Text>
              )}

              <InputField
                label="New Password"
                value={userData.new_password || ''}
                placeholder="Enter new password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) => {
                  setPasswordError(null);
                  handleFieldChange('new_password', value);
                }}
                type={showNewPassword ? 'text' : 'password'}
                isPassword
                toggleVisibility={() => setShowNewPassword((prev) => !prev)}
                isVisible={showNewPassword}
                disabled={!passwordVerified}
              />
              <InputField
                label="Confirm Password"
                value={userData.confirm_new_password || ''}
                placeholder="Confirm new password"
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                onChange={(value) => {
                  setPasswordError(null);
                  handleFieldChange('confirm_new_password', value);
                }}
                type={showConfirmPassword ? 'text' : 'password'}
                isPassword
                toggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                isVisible={showConfirmPassword}
                disabled={!passwordVerified}
              />
            </Box>
            <Box {...panelProps}>
              <ActionButton label="Save Changes" onClick={handleSaveProfile} />
              {saveMessage && <Text>{saveMessage}</Text>}
            </Box>
          </Box>
        </div>
        <Invoices
          userId={userId}
          userType={selectedUser?.type}
          billingAddress={userData}
        />
      </Box>
    </Form>
  );
}

export default UsersProfile;

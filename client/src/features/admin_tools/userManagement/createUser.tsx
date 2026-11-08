
import {
  Card,
  Grid,
  TextInput,
  Select,
  Box,
  Text,
  Layer,
} from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { User } from '../../../types';
import { createUser } from '../../../store/users/usersThunks';
import { useAppDispatch } from '../../../store/hooks';
import { useState } from 'react';
import { isValidEmail, isValidPassword } from '../../../helpers/userValidation';

function CreateNewUser() {
  const dispatch = useAppDispatch();

  const requiredDetails: User = {
    first_name: '',
    last_name: '',
    email_address: '',
    telephone_number: '',
    address_line1: '',
    address_line2: '',
    address_line3: '',
    town: '',
    county: '',
    postcode: '',
    type: '',
    status: '',
    password: '',
    id: '',
    invoice_id: 0,
  };

  const requiredFields = [
    'first_name',
    'last_name',
    'email_address'
  ] as const;

  const [newUser, setNewUser] = useState<Partial<User>>(requiredDetails);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [touched, setTouched] = useState({ email: false, telephone: false, password: false, confirm: false });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState<boolean>(false);
  const [showValidationWarning, setShowValidationWarning] =
    useState<boolean>(false);

  const handleCreateUser = async () => {
    try {
      await dispatch(createUser({ ...newUser, email_address: email, password })).unwrap();

      setStatusIsError(false);
      setStatusMessage(
        `User ${newUser.first_name} ${newUser.last_name} was created successfully.`
      );

      setNewUser(requiredDetails);
      setPassword('');
      setConfirmPassword('');
      setTouched({ email: false, telephone: false, password: false, confirm: false });
    } catch (error) {
      console.error('Failed to create user:', error);

      setStatusIsError(true);
      setStatusMessage(
        typeof error === 'string'
          ? error
          : 'Failed to create user. Please try again.'
      );
    }
  };

  const email = (newUser.email_address ?? '').trim();
  const telephone = (newUser.telephone_number ?? '').trim();
  const emailError = !isValidEmail(email) ? 'Enter a valid email address.' : '';
  const phoneDigits = telephone.replace(/\D/g, '');
  const telephoneError = telephone && (!/^\+?[\d\s().-]+$/.test(telephone) || phoneDigits.length < 7 || phoneDigits.length > 15)
    ? 'Enter a valid telephone number (7 to 15 digits).' : '';
  const passwordError = !isValidPassword(password) ? 'Password must be at least 8 characters.' : '';
  const passwordMatch = password !== '' && password === confirmPassword;
  const confirmError = !passwordMatch ? 'Passwords must match.' : '';

  const getFieldLabel = (field: string) =>
    field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getMissingFields = () => {
    return requiredFields.filter(
      (field) => !newUser[field]?.toString().trim()
    );
  };

  const handleCreateUserClick = () => {
    const missingFields = getMissingFields();

    setTouched({ email: true, telephone: true, password: true, confirm: true });
    if (missingFields.length > 0 || !passwordMatch) {
      setShowValidationWarning(true);
      return;
    }

    if (emailError || telephoneError || passwordError) return;
    handleCreateUser();
  };

  const missingFields = getMissingFields();

  return (

    <>
      <Card
        pad="small"
        background="white"
        elevation="none" round="none"
        overflow="auto"
      >
        <Grid
          columns={['1/2', '1/2']}
          gap="small"
          pad="small"
          style={{ maxHeight: '850px', overflowY: 'auto' }}
        >
          <Box direction="column" gap="xsmall">
            <TextInput
              placeholder="First Name"
              value={newUser.first_name}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  first_name: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Last Name"
              value={newUser.last_name}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  last_name: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Email Address"
              value={newUser.email_address}
              type="email"
              aria-invalid={touched.email && !!emailError}
              aria-describedby={touched.email && emailError ? 'create-user-email-error' : undefined}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  email_address: event.target.value,
                });
              }}
            />
            {touched.email && emailError && <Text id="create-user-email-error" color="status-critical" size="small">{emailError}</Text>}

            <TextInput
              placeholder="Telephone Number"
              value={newUser.telephone_number}
              type="tel"
              aria-invalid={touched.telephone && !!telephoneError}
              aria-describedby={touched.telephone && telephoneError ? 'create-user-phone-error' : undefined}
              onBlur={() => setTouched((prev) => ({ ...prev, telephone: true }))}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  telephone_number: event.target.value,
                });
              }}
            />
            {touched.telephone && telephoneError && <Text id="create-user-phone-error" color="status-critical" size="small">{telephoneError}</Text>}

            <TextInput
              placeholder="Address Line 1"
              value={newUser.address_line1}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  address_line1: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Address Line 2"
              value={newUser.address_line2}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  address_line2: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Address Line 3"
              value={newUser.address_line3}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  address_line3: event.target.value,
                });
              }}
            />
          </Box>

          <Box direction="column" gap="xsmall">
            <TextInput
              placeholder="Town"
              value={newUser.town}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  town: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="County"
              value={newUser.county}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  county: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Postcode"
              value={newUser.postcode}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  postcode: event.target.value,
                });
              }}
            />

            <Select
              options={['admin', 'customer']}
              placeholder="Select User Type"
              value={newUser.type}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  type: event.target.value,
                });
              }}
            />

            <Select
              options={['active', 'inactive']}
              placeholder="Select User Status"
              value={newUser.status}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  status: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Password"
              type="password"
              value={password}
              aria-invalid={touched.password && !!passwordError}
              aria-describedby={touched.password && passwordError ? 'create-user-password-error' : undefined}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            {touched.password && passwordError && <Text id="create-user-password-error" color="status-critical" size="small">{passwordError}</Text>}

            <TextInput
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              aria-invalid={touched.confirm && !!confirmError}
              aria-describedby={touched.confirm && confirmError ? 'create-user-confirm-error' : undefined}
              onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              disabled={!password}
            />
            {touched.confirm && confirmError && <Text id="create-user-confirm-error" color="status-critical" size="small">{confirmError}</Text>}
          </Box>

          {statusMessage && (
            <Text
              color={statusIsError ? 'status-critical' : 'status-ok'}
            >
              {statusMessage}
            </Text>
          )}

          <ActionButton label="Create User" onClick={handleCreateUserClick} disabled={!passwordMatch} fixed />

          <ActionButton secondary label="Reset" onClick={() => {
              setNewUser(requiredDetails);
              setPassword('');
              setConfirmPassword('');
              setTouched({ email: false, telephone: false, password: false, confirm: false });
              setStatusMessage(null);
              setShowValidationWarning(false);
            }} fixed />
        </Grid>
      </Card>

      {showValidationWarning && (
        <Layer
          onEsc={() => setShowValidationWarning(false)}
          onClickOutside={() => setShowValidationWarning(false)}
        >
          <Box pad="medium" gap="medium" width="large" round="medium">
            <Text weight="bold">
              Missing required information
            </Text>

            <Text>
              Please complete the following before creating the user:
            </Text>

            {missingFields.length > 0 && (
              <Box gap="small">
                {missingFields.map((field) => (
                  <Text key={field}>
                    • {getFieldLabel(field)}
                  </Text>
                ))}
              </Box>
            )}

            {!passwordMatch && (
              <Text>
                • Password and Confirm Password must match
              </Text>
            )}

            <ActionButton label="OK" onClick={() => setShowValidationWarning(false)} fixed />
          </Box>
        </Layer>
      )}
    </>
  );
}

export default CreateNewUser;

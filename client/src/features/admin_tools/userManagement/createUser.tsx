
import {
  Card,
  Grid,
  TextInput,
  Select,
  Box,
  Button,
  Text,
  Layer,
} from 'grommet';
import { User } from '../../../types';
import { buttonStyles } from '../../../helpers/formatting';
import { createUser } from '../../../store/users/usersThunks';
import { useAppDispatch } from '../../../store/hooks';
import { useState } from 'react';

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
    'email_address',
    'telephone_number',
    'address_line1',
    'town',
    'county',
    'postcode',
    'type',
    'status',
  ] as const;

  const [newUser, setNewUser] = useState<Partial<User>>(requiredDetails);
  const [passwordMatch, setPasswordMatch] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState<boolean>(false);
  const [showValidationWarning, setShowValidationWarning] =
    useState<boolean>(false);

  const handleCreateUser = async () => {
    console.log(`Creating user with data:`, newUser);

    try {
      await dispatch(createUser(newUser as User)).unwrap();

      console.log('User created successfully');

      setStatusIsError(false);
      setStatusMessage(
        `User ${newUser.first_name} ${newUser.last_name} was created successfully.`
      );

      setNewUser(requiredDetails);
      setPassword('');
      setPasswordMatch(false);
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

  const validatePassword = (value: string) => {
    if (password === value && password !== '') {
      setPasswordMatch(true);

      setNewUser((prev) => ({
        ...prev,
        password: value,
      }));
    } else {
      setPasswordMatch(false);

      setNewUser((prev) => ({
        ...prev,
        password: '',
      }));
    }
  };

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

    if (missingFields.length > 0 || !passwordMatch) {
      setShowValidationWarning(true);
      return;
    }

    handleCreateUser();
  };

  const missingFields = getMissingFields();

  return (

    //TODO: Need to add in some inline validations for email, telephone number and password character requirements

    <>
      <Card
        pad="small"
        background="light-2"
        elevation="small"
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
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  email_address: event.target.value,
                });
              }}
            />

            <TextInput
              placeholder="Telephone Number"
              value={newUser.telephone_number}
              onChange={(event) => {
                setNewUser({
                  ...newUser,
                  telephone_number: event.target.value,
                });
              }}
            />

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
              onChange={(event) => {
                const value = event.target.value;

                setPassword(value);

                // If the password changes, the existing confirmation
                // is no longer necessarily valid.
                setPasswordMatch(false);

                setNewUser((prev) => ({
                  ...prev,
                  password: '',
                }));
              }}
            />

            <TextInput
              placeholder="Confirm Password"
              type="password"
              onChange={(event) => {
                validatePassword(event.target.value);
              }}
              disabled={!password}
            />
          </Box>

          {statusMessage && (
            <Text
              color={statusIsError ? 'status-critical' : 'status-ok'}
            >
              {statusMessage}
            </Text>
          )}

          <Button
            label="Create User"
            style={buttonStyles.default}
            onClick={handleCreateUserClick}
          />

          <Button
            label="Reset"
            style={buttonStyles.default}
            onClick={() => {
              setNewUser(requiredDetails);
              setPassword('');
              setPasswordMatch(false);
              setStatusMessage(null);
              setShowValidationWarning(false);
            }}
          />
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

            <Button
              label="OK"
              onClick={() => setShowValidationWarning(false)}
              style={buttonStyles.default}
            />
          </Box>
        </Layer>
      )}
    </>
  );
}

export default CreateNewUser;


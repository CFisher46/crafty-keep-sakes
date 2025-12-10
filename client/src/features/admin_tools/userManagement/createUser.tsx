import { Card, Grid, TextInput, Select, Box, Button } from 'grommet';
import { User } from '../../../types';
import { buttonStyles } from '../../../helpers/formatting';
import { createUser } from '../../../store/users/usersThunks';
import { useAppDispatch } from '../../../store/hooks';
import { useState, useEffect } from 'react';

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
  const [newUser, setNewUser] = useState<Partial<User>>(requiredDetails);
  const [passwordMatch, setPasswordMatch] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const handleCreateUser = async () => {
    console.log(`Creating user with data:`, newUser);
    try {
      await dispatch(createUser(newUser as User)).unwrap();
      //TODO: Add a success popup window with an OK button and reset rerender admin page
      console.log('User created successfully');
    } catch (error) {
      //TODO: Add error popup window with error message with the error provided by the backend
      console.error('Failed to create user:', error);
    }
  };

  const validatePassword = (e: string) => {
    if (password === e) {
      setPasswordMatch(true);
      setNewUser({ ...newUser, password: e });
    } else {
      setPasswordMatch(false);
    }
  };

  return (
    <Card pad="small" background="light-2" elevation="small" overflow="auto">
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
              setNewUser({ ...newUser, first_name: event.target.value });
            }}
          />
          <TextInput
            placeholder="Last Name"
            value={newUser.last_name}
            onChange={(event) => {
              setNewUser({ ...newUser, last_name: event.target.value });
            }}
          />
          <TextInput
            placeholder="Email Address"
            value={newUser.email_address}
            onChange={(event) => {
              setNewUser({ ...newUser, email_address: event.target.value });
            }}
          />
          <TextInput
            placeholder="Telephone Number"
            value={newUser.telephone_number}
            onChange={(event) => {
              setNewUser({ ...newUser, telephone_number: event.target.value });
            }}
          />
          <TextInput
            placeholder="Address Line 1"
            value={newUser.address_line1}
            onChange={(event) => {
              setNewUser({ ...newUser, address_line1: event.target.value });
            }}
          />
          <TextInput
            placeholder="Address Line 2"
            value={newUser.address_line2}
            onChange={(event) => {
              setNewUser({ ...newUser, address_line2: event.target.value });
            }}
          />
          <TextInput
            placeholder="Address Line 3"
            value={newUser.address_line3}
            onChange={(event) => {
              setNewUser({ ...newUser, address_line3: event.target.value });
            }}
          />
        </Box>
        <Box direction="column" gap="xsmall">
          <TextInput
            placeholder="Town"
            value={newUser.town}
            onChange={(event) => {
              setNewUser({ ...newUser, town: event.target.value });
            }}
          />
          <TextInput
            placeholder="County"
            value={newUser.county}
            onChange={(event) => {
              setNewUser({ ...newUser, county: event.target.value });
            }}
          />
          <TextInput
            placeholder="Postcode"
            value={newUser.postcode}
            onChange={(event) => {
              setNewUser({ ...newUser, postcode: event.target.value });
            }}
          />
          <Select
            options={['admin', 'customer']}
            placeholder="Select User Type"
            value={newUser.type}
            onChange={(event) => {
              setNewUser({ ...newUser, type: event.target.value });
            }}
          />
          <Select
            options={['active', 'inactive']}
            placeholder="Select User Status"
            value={newUser.status}
            onChange={(event) => {
              setNewUser({ ...newUser, status: event.target.value });
            }}
          />

          <TextInput
            placeholder="Password"
            type="password"
            onChange={(event) => {
              setPassword(event.target.value);
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

        <Button
          label="Create User"
          style={buttonStyles.default}
          onClick={handleCreateUser}
          disabled={!passwordMatch}
        />
        <Button
          label="Reset"
          style={buttonStyles.default}
          onClick={() => {
            setNewUser(requiredDetails);
            setPassword('');
            setConfirmPassword('');
            setPasswordMatch(false);
          }}
        />
      </Grid>
    </Card>
  );
}
export default CreateNewUser;

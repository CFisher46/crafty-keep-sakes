import { Box, Text, Button, Select } from 'grommet';
import { fetchAllUsers, fetchUserById } from '../../../store/users/usersThunks';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { User } from '../../../types';
import { buttonStyles } from '../../../helpers/formatting';
import UpdateUser from './updateUser';

const UserManagement = ({ title }: { title: string }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [userToUpdate, setUserToUpdate] = useState<User | null>(null);
  const [createUser, setCreateUser] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await dispatch(fetchAllUsers());
      setUsers(result.payload as User[]);
    };
    fetchUsers();
  }, [dispatch]);

  const handleFetchUser = async () => {
    if (!selectedUser) return;
    const result = await dispatch(fetchUserById(selectedUser.id));
    setUserToUpdate(result.payload as User);
  };

  return (
    <Box pad="small" gap="small">
      <Text textAlign="center" weight="bold" size="medium">
        {title}
      </Text>

      <Box direction="row" gap="small" align="center" justify="center">
        <Select
          options={users}
          labelKey={(option) =>
            `${option.last_name}, ${option.first_name} (${option.email_address})`
          }
          value={
            `${selectedUser?.last_name}, ${selectedUser?.first_name} (${selectedUser?.email_address})` ||
            'Select a User'
          }
          placeholder="Select a User"
          onChange={({ option }) => setSelectedUser(option)}
          size="small"
        />

        <Button
          size="small"
          label="Edit User"
          onClick={() => {
            handleFetchUser();
            setCreateUser(false);
          }}
          style={buttonStyles.default}
          disabled={!selectedUser}
        />
        <Button
          size="small"
          label="Create User"
          onClick={() => {
            setCreateUser(true);
            setUserToUpdate(null);
            setSelectedUser(undefined);
          }}
          style={buttonStyles.default}
        />
      </Box>

      {userToUpdate && <UpdateUser {...userToUpdate} />}
      {createUser && <Box>Create User Form Placeholder</Box>}
    </Box>
  );
};

export default UserManagement;

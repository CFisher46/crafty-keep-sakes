import React, { useState, useEffect } from 'react';
import { Box, Select, Text, Button } from 'grommet';
import { AuditLogs } from './audits/page';
import CreateNewUser from './userManagement/createUser';
import UpdateUser from './userManagement/updateUser';
import { User } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { fetchAllUsers, fetchUserById } from '../../store/users/usersThunks';
import { buttonStyles } from '../../helpers/formatting';

function AdminTools() {
  const [requestedAction, setRequestedAction] = React.useState('');
  const [requestedTool, setRequestedTool] = React.useState('');
  const [ActiveComponent, setActiveComponent] =
    React.useState<React.ComponentType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await dispatch(fetchAllUsers());
      setUsers(result.payload as User[]);
    };
    fetchUsers();
  }, [dispatch]);

  const resetAll = () => {
    setRequestedAction('');
    setRequestedTool('');
    setSelectedUser(undefined);
    setActiveComponent(null);
  };

  const handleRequest = async (
    requestedAction: string,
    requestedTool: string
  ) => {
    if (requestedTool === 'User' && requestedAction === 'Add') {
      setActiveComponent(() => CreateNewUser);
      setSelectedUser(undefined);
    }
    if (requestedTool === 'User' && requestedAction === 'Update') {
      if (selectedUser) {
        const result = await dispatch(fetchUserById(selectedUser.id));
        const fetchedUser = result.payload as User;
        setActiveComponent(() => () => UpdateUser(fetchedUser)); // Use fetchedUser directly
      }
    } else if (requestedTool === 'User' && requestedAction === 'Delete') {
      console.log('User Delete selected');
      setActiveComponent(null); // or set to DeleteUser component when available
    } else if (requestedTool === 'Product' && requestedAction === 'Add') {
      console.log('Product Add selected');
      setActiveComponent(null); // or set to AddProduct component when available
    } else if (requestedTool === 'Product' && requestedAction === 'Update') {
      console.log('Product Update selected');
      setActiveComponent(null);
    } else if (requestedTool === 'Product' && requestedAction === 'Delete') {
      console.log('Product Delete selected');
      setActiveComponent(null);
    } else if (requestedTool === 'Report' && requestedAction === 'Add') {
      console.log('Report Add selected');
      setActiveComponent(null);
    } else if (requestedTool === 'Report' && requestedAction === 'Update') {
      console.log('Report Update selected');
      setActiveComponent(null);
    } else if (requestedTool === 'Report' && requestedAction === 'Delete') {
      console.log('Report Delete selected');
      setActiveComponent(null);
    }
  };

  return (
    <>
      <Box
        pad={{ horizontal: '1px' }}
        round="small"
        gap="small"
        background="white"
        elevation="small"
      >
        <Box pad="small" direction="row">
          <Text>
            {'I want to '}
            <Select
              placeholder="Select an action"
              options={['Add', 'Update', 'Delete']}
              onChange={({ option }) => setRequestedAction(option)}
              value={requestedAction}
            />
          </Text>
          <Box pad="xxsmall" />
          <Text>
            {'a '}
            <Select
              placeholder="Select a tool"
              options={['User', 'Product', 'Report']}
              onChange={({ option }) => setRequestedTool(option)}
              value={requestedTool}
            />
          </Text>
          <Box pad="xsmall" />
          {requestedTool === 'User' && requestedAction === 'Update' && (
            <Text>
              {'Select a User to Update: '}
              <Select
                options={users}
                labelKey={(option) =>
                  `${option.last_name}, ${option.first_name} (${option.email_address})`
                }
                value={selectedUser}
                placeholder="Select a User"
                onChange={({ option }) => setSelectedUser(option)}
                size="small"
              />
            </Text>
          )}
          <Box pad="xsmall" direction="row" gap="small">
            <Button
              label="Submit"
              onClick={() => handleRequest(requestedAction, requestedTool)}
              style={buttonStyles.default}
            />
            <Button
              label="Reset"
              onClick={() => {
                resetAll();
              }}
              style={buttonStyles.default}
            />
          </Box>
        </Box>
      </Box>
      <Box pad="small" />
      {ActiveComponent && (
        <>
          <Box pad="small" background="white" round="small" elevation="small">
            <ActiveComponent />
          </Box>
          <Box pad="small" />
        </>
      )}

      <Box pad="small" background={'white'} round="small" elevation="small">
        <AuditLogs />
      </Box>
    </>
  );
}

export default AdminTools;

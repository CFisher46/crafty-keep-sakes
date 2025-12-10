import { Box, Button, Card, Grid, TextInput, Text } from 'grommet';
import { buttonStyles } from '../../../helpers/formatting';
import { useState, useEffect } from 'react';

import { User } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { deleteUser } from '../../../store/users/usersThunks';

function DeleteExistingUser(fetchedUserData: User) {
  const dispatch = useAppDispatch();
  const user = fetchedUserData;
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [validDelete, setValidDelete] = useState(false);
  const deletePasscode = `delete ${user.email_address}`;

  useEffect(() => {
    console.log(`Delete confirmation code: ${deletePasscode}`);
    console.log(`Delete confirmation entered: ${deleteConfirmation}`);
    if (deleteConfirmation === deletePasscode) {
      setValidDelete(true);
    }
  }, [deleteConfirmation, deletePasscode]);

  const handleDelete = async () => {
    if (deleteConfirmation === deletePasscode) {
      try {
        await dispatch(deleteUser(user.id)).unwrap();
        console.log(`User ${user.id} deleted successfully.`);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
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
          <Text>Type "{deletePasscode}" to confirm deletion</Text>
          <TextInput
            onChange={(event) => {
              setDeleteConfirmation(event.target.value);
            }}
          />
        </Box>
        <Button
          label="Delete User"
          onClick={() => handleDelete()}
          disabled={!validDelete}
          style={buttonStyles.default}
        />
      </Grid>
    </Card>
  );
}

export default DeleteExistingUser;

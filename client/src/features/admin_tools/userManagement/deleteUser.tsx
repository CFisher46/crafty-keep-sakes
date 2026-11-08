import { Box, Card, Grid, Layer, Text, TextInput, Notification } from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { useState, useEffect } from 'react';
import { User } from '../../../types';
import { deleteUser } from '../../../store/users/usersThunks';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

function DeleteExistingUser(fetchedUserData: User) {
  const dispatch = useAppDispatch();
  const user = fetchedUserData;
  // Get the currently logged-in user from auth state
  const loggedInUser = useAppSelector((state) => state.auth.user);
  const isSelfDelete = !!(loggedInUser && loggedInUser.id === user.id);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [validDelete, setValidDelete] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const deletePasscode = `delete ${user.email_address}`;

  useEffect(() => {
    if (deleteConfirmation === deletePasscode) {
      setValidDelete(true);
    } else {
      setValidDelete(false);
    }
  }, [deleteConfirmation, deletePasscode]);

  const handleDeleteClick = () => {
    if (validDelete && !isSelfDelete) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await dispatch(deleteUser(user.id)).unwrap();
      console.log(`User ${user.id} deleted successfully.`);
      setShowConfirmation(false);
      setDeleteConfirmation('');
      setStatusIsError(false);
      setStatusMessage(`User ${user.first_name} ${user.last_name} has been deleted successfully.`);
    } catch (error) {
      console.error('Failed to delete user:', error);
      setShowConfirmation(false);
      setStatusIsError(true);
      setStatusMessage(
        typeof error === 'string' ? error : 'Failed to delete user. Please try again.'
      );
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      {statusMessage && (
          <Notification
            title={statusIsError ? 'Error' : 'Success'}
            message={statusMessage}
            status={statusIsError ? 'warning' : 'normal'}
            onClose={() => setStatusMessage(null)}
        />
      )}
      <Card pad="small" background="white" elevation="none" round="none" overflow="auto">
        <Grid
          columns={['1/2', '1/2']}
          gap="small"
          pad="small"
          style={{ maxHeight: '850px', overflowY: 'auto' }}
        >
          <Box margin={{ top: 'medium' }} gap="xsmall">
            <Text weight="bold">Confirmation Required</Text>
            <Text size="small">
              Type "
              <Text weight="bold" color="status-critical">
                {deletePasscode}
              </Text>
              " to enable deletion
            </Text>
            <TextInput
              placeholder="Type confirmation text here"
              value={deleteConfirmation}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value);
              }}
              disabled={isSelfDelete}
            />
            {isSelfDelete && (
              <Text
                size="small"
                color="status-critical"
                margin={{ top: 'small' }}
              >
                You cannot delete your own account.
              </Text>
            )}
            <ActionButton
              label="Delete User"
              onClick={handleDeleteClick}
              disabled={!validDelete || isSelfDelete}
              fixed
            />
          </Box>

          <Box direction="column" justify="center" align="center">
            {!validDelete && deleteConfirmation && !isSelfDelete && (
              <Text
                size="small"
                color="status-critical"
                margin={{ top: 'small' }}
              >
                Confirmation text doesn't match
              </Text>
            )}
          </Box>
        </Grid>
      </Card>

      {showConfirmation && (
        <Layer onEsc={handleCancelDelete} onClickOutside={handleCancelDelete}>
          <Box pad="medium" gap="small" width="medium">
            <Text size="large" weight="bold" color="status-critical">
              ⚠️ Final Confirmation
            </Text>
            <Text>You are about to permanently delete:</Text>
            <Text size="small">
              Blog comments, views, and reactions will be retained without this user&apos;s attribution.
              Accounts with orders or authored blog posts cannot be deleted until those records are resolved.
            </Text>
            <Box
              pad="small"
              background="light-2"
              round="small"
              border={{ color: 'status-critical', size: 'small' }}
            >
              <Text weight="bold">
                {user.first_name} {user.last_name}
              </Text>
              <Text size="small">{user.email_address}</Text>
              <Text size="small">User ID: {user.id}</Text>
            </Box>
            <Text size="small" color="status-critical" weight="bold">
              This action cannot be undone!
            </Text>
            <Box
              direction="row"
              gap="small"
              justify="end"
              margin={{ top: 'medium' }}
            >
              <ActionButton secondary label="Cancel" onClick={handleCancelDelete} fixed />
              <ActionButton label="Confirm Delete" onClick={handleConfirmDelete} fixed />
            </Box>
          </Box>
        </Layer>
      )}
    </>
  );
}

export default DeleteExistingUser;

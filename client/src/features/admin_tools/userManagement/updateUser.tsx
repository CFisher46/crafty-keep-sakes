import { Box, Text, TextInput, Card, Grid, Button } from 'grommet';
import { useState } from 'react';
import { User } from '../../../types';
import { updateUser } from '../../../store/users/usersThunks';
import { useAppDispatch } from '../../../store/hooks';
import { buttonStyles } from '../../../helpers/formatting';

const UpdateUser = (updateUserData: Partial<User>) => {
  const [changedFields, setChangedFields] = useState<Partial<User>>({});
  const dispatch = useAppDispatch();

  const handleFieldChange = (key: string, value: string) => {
    setChangedFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUserUpdate = async () => {
    const changedFieldsFiltered = Object.fromEntries(
      Object.entries(changedFields).filter(
        ([_, value]) => value !== undefined && value !== ''
      )
    );

    if (Object.keys(changedFieldsFiltered).length === 0) {
      console.log('No fields to update');
      return;
    }

    console.log(
      `Updating user ${updateUserData.id} with data:`,
      changedFieldsFiltered
    );

    try {
      await dispatch(
        updateUser({
          id: updateUserData.id!,
          user: changedFieldsFiltered,
          previousUser: updateUserData as User,
        })
      ).unwrap();

      console.log('User updated successfully');
      setChangedFields({});
    } catch (error) {
      console.error('Failed to update user:', error);
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
        {Object.entries(updateUserData)
          .filter(
            ([key]) =>
              key !== 'password' && key !== 'invoice_id' && key !== 'id'
          )
          .map(([key, value], index) => (
            <Box key={index} direction="column" gap="xsmall">
              <Text
                size="small"
                weight="bold"
                style={{ textTransform: 'capitalize' }}
              >
                {key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
                :
              </Text>
              <TextInput
                placeholder={String(value)}
                value={changedFields[key as keyof User] ?? ''}
                onChange={(event) => handleFieldChange(key, event.target.value)}
                size="small"
                style={{ fontSize: '12px' }}
              />
            </Box>
          ))}
        <Button
          label="Update User"
          onClick={handleUserUpdate}
          style={buttonStyles.default}
        />
      </Grid>
    </Card>
  );
};

export default UpdateUser;

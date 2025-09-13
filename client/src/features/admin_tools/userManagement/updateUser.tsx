import { Box, Text, TextInput, Card, Grid } from 'grommet';
import { User } from '../../../types';

const UpdateUser = (updateUser: Partial<User>) => {
  return (
    <Card pad="small" background="light-2" elevation="small" overflow="auto">
      <Grid
        columns={['1/2', '1/2']}
        gap="small"
        pad="small"
        style={{ maxHeight: '850px', overflowY: 'auto' }}
      >
        {Object.entries(updateUser)
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
                size="small"
                style={{ fontSize: '12px' }}
              />
            </Box>
          ))}
      </Grid>
    </Card>
  );
};
export default UpdateUser;

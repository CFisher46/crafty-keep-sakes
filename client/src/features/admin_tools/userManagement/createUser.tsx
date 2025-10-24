import { Card, Grid, TextInput, Select, Box } from 'grommet';
import { User } from '../../../types';

function CreateNewUser() {
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
    password: '#default%Cks@Password/1%',
    id: '',
    invoice_id: 0,
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
            value={requiredDetails.first_name}
          />
          <TextInput
            placeholder="Last Name"
            value={requiredDetails.last_name}
          />
          <TextInput
            placeholder="Email Address"
            value={requiredDetails.email_address}
          />
          <TextInput
            placeholder="Telephone Number"
            value={requiredDetails.telephone_number}
          />
          <TextInput
            placeholder="Address Line 1"
            value={requiredDetails.address_line1}
          />
          <TextInput
            placeholder="Address Line 2"
            value={requiredDetails.address_line2}
          />
          <TextInput
            placeholder="Address Line 3"
            value={requiredDetails.address_line3}
          />
        </Box>
        <Box direction="column" gap="xsmall">
          <TextInput placeholder="Town" value={requiredDetails.town} />
          <TextInput placeholder="County" value={requiredDetails.county} />
          <TextInput placeholder="Postcode" value={requiredDetails.postcode} />
          <Select
            options={['admin', 'customer']}
            placeholder="Select User Type"
            value={requiredDetails.type}
            onChange={() => {}}
          />
          <Select
            options={['active', 'inactive']}
            placeholder="Select User Status"
            value={requiredDetails.status}
            onChange={() => {}}
          />
        </Box>
      </Grid>
    </Card>
  );
}
export default CreateNewUser;

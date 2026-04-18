import {Box, Button, TextInput} from 'grommet';
import { buttonStyles } from '../../helpers/formatting';

function ShopFilterBar() {
    return(
        <Box pad="medium" background="white" align="center" round="small" elevation="small" direction='row'>
            <Box direction='row'>
                    <TextInput placeholder="Search for a product..." />
                <Box pad="xsmall" gap="small" direction='row'>
                    <Button label="Search"  style={buttonStyles.default} />
                    <Button label="Filter"  style={buttonStyles.default} />
                </Box>
            </Box>
        </Box>
    )
}

export default ShopFilterBar; 
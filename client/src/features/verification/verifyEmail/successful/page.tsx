import {Box, Button, Text} from 'grommet'
import { useNavigate } from 'react-router-dom'

 function SuccessfulVerificationPage() {
    const navigate = useNavigate()
    return (
        <Box align="center" justify="center" pad="large">
            <Text size="large" weight="bold">
                Email Verified Successfully!
            </Text>
            <Button
                label="Go to Login"
                onClick={() => navigate('/home')}
            />
        </Box>
    );
}
export { SuccessfulVerificationPage };

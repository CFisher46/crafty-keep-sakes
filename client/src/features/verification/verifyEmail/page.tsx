import { Button, Text, Box } from 'grommet'
import { useDispatch } from 'react-redux';
import { useState } from 'react';
import { verifyEmail } from '../../../store/verification/verificationThunks';
import { useSearchParams } from 'react-router-dom';
import {SuccessfulVerificationPage} from './successful/page'

function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [firstRender, setFirstRender] = useState(true);
    const [userVerified,setUserVerified] = useState(false);

    const dispatch = useDispatch();

    const handleVerifyEmail = async () => {
        if (!token) {
            console.error('Verification token is missing');
            return;
        }

        try {
            await dispatch(verifyEmail({ token }) as any);
            setUserVerified(true);
            setFirstRender(false);
        } catch (error) {
            setUserVerified(false);
        }
    };
    return (
        <>

        {!userVerified && firstRender && (
            <>
                <Box>
            <Text weight="bold">Verify Email</Text>
            <Text>Please click the button below to verify your email.</Text>
        </Box><Box margin={{ top: 'medium' }} onClick={handleVerifyEmail}>
                <Button label="Verify Email" />
            </Box>
            </>
        )}
                {userVerified && !firstRender && <SuccessfulVerificationPage />}
                {!userVerified && !firstRender && (
                   <> <Text color="status-error">Email verification failed. Please try again.</Text></>
                )}
            </>

    );
}

export default VerifyEmailPage; 
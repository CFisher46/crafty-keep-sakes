import { Box, Text, TextInput } from 'grommet';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ui } from '../../../helpers/theme';
import { useAppDispatch } from '../../../store/hooks';
import { resendVerificationEmail, verifyEmail } from '../../../store/verification/verificationThunks';
import ActionButton from '../../landingPage/components/ActionButton';

const cardStyle = {
  width: '100%',
  maxWidth: '600px',
  boxSizing: 'border-box' as const,
  backgroundColor: '#ffffff',
  border: `1px solid ${ui.line}`,
};

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [token] = useState(() => searchParams.get('token'));
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'already' | 'error'>(
    token ? 'ready' : 'error'
  );
  const [error, setError] = useState(token ? '' : 'This verification link is incomplete.');
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerifyEmail = async () => {
    if (!token) {
      setStatus('error');
      setError('This verification link is incomplete. Request a new one below.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const result = await dispatch(verifyEmail({ token })).unwrap();
      setStatus(result.status === 'already_verified' ? 'already' : 'success');
    } catch (reason) {
      setStatus('error');
      setError(typeof reason === 'string' ? reason : 'We could not verify this email. Please try again.');
    }
  };

  const handleResend = async () => {
    setResendError('');
    setResendMessage('');
    setResending(true);
    try {
      const result = await dispatch(resendVerificationEmail({ email })).unwrap();
      setResendMessage(result.message);
      setResendCooldown(60);
    } catch (reason) {
      setResendError(typeof reason === 'string' ? reason : 'Unable to send a request. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const isComplete = status === 'success' || status === 'already';

  return (
    <Box align="center" pad={{ vertical: 'xlarge', horizontal: 'medium' }}>
      <Box
        align="stretch"
        gap="large"
        pad={{ vertical: 'xlarge', horizontal: 'xlarge' }}
        style={cardStyle}
      >

        {isComplete ? (
          <Box gap="medium">
            <Box gap="small">
              <Text
                size="xsmall"
                weight="bold"
                style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}
              >
                Account verification
              </Text>
            <Text
              as="h1"
              margin="none"
                style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: '30px', lineHeight: 1.25, color: ui.ink }}
            >
              {status === 'already' ? 'Your email is already verified' : 'Email verified successfully'}
            </Text>
            </Box>
            <Text size="small" style={{ color: ui.muted }}>
              Your account is ready. Sign in to continue to Crafty Keepsakes.
            </Text>
            <ActionButton
              label="Go to sign in"
              onClick={() => navigate('/Login')}
            />
          </Box>
        ) : (
          <Box gap="large">
            <Box gap="medium">
              <Box gap="small">
                <Text
                  size="xsmall"
                  weight="bold"
                  style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}
                >
                  Account verification
                </Text>
                <Text
                  as="h1"
                  margin="none"
                  style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: '30px', lineHeight: 1.25, color: ui.ink }}
                >
                  Verify your email address
                </Text>
              </Box>
              <Text size="small" style={{ color: ui.muted, lineHeight: 1.6 }}>
                {status === 'ready'
                  ? 'Confirm your email address to activate your account.'
                  : 'The link may have expired or already been used. You can request a fresh verification email below.'}
              </Text>
              {status === 'ready' && (
                <ActionButton
                  label="Verify email"
                  onClick={handleVerifyEmail}
                />
              )}
              {status === 'loading' && (
                <Text size="small" style={{ color: ui.muted }}>Verifying your email…</Text>
              )}
              {error && <Text size="small" color="status-critical">{error}</Text>}
            </Box>

            <Box gap="medium" pad={{ top: 'medium' }} border={{ side: 'top', color: ui.line }}>
              <Box gap="small">
                <Text weight="bold" style={{ color: ui.ink, fontSize: '18px' }}>Need a new link?</Text>
                <Text size="small" style={{ color: ui.muted, lineHeight: 1.6 }}>
                  Enter the address used to create your account. We&apos;ll send a link if the account needs verification.
                </Text>
              </Box>
              <TextInput
                aria-label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <ActionButton
                label={resending ? 'Requesting…' : resendCooldown > 0 ? `Try again in ${resendCooldown}s` : 'Send a new link'}
                onClick={handleResend}
                disabled={resending || resendCooldown > 0 || !email.trim()}
                fixed
              />
              {resendMessage && <Text size="small" style={{ color: ui.accent }}>{resendMessage}</Text>}
              {resendError && <Text size="small" color="status-critical">{resendError}</Text>}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default VerifyEmailPage;

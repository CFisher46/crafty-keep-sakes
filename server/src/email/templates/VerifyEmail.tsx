import {
  Text,
  Button,
} from 'react-email';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

interface VerifyEmailProps {
  name: string;
  verificationUrl: string;
}

const colors = {
  muted: '#6F675F',
  accent: '#5E7060',
};

export default function VerifyEmail({
  name,
  verificationUrl
}: VerifyEmailProps) {
  return (
    <EmailLayout preview="Verify your Crafty Keepsakes account">
          <EmailHeader />
          <Text>Hi {name},</Text>
          <Text>
            Thanks for creating an account with us. Before you can get started, please verify your email address.
          </Text>

          <Button
            href={verificationUrl}
            style={{
              backgroundColor: colors.accent,
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '2px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}
          >
            Verify my email
          </Button>

          <Text>This link will expire in 24 hours. If the button does not work, copy and paste this link:</Text>
          <Text style={{ color: colors.muted, fontSize: '12px', wordBreak: 'break-all' }}>{verificationUrl}</Text>
          <EmailFooter />
    </EmailLayout>
  );
}
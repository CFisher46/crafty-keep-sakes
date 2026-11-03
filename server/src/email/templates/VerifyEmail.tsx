import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr
} from 'react-email';

interface VerifyEmailProps {
  name: string;
  verificationUrl: string;
}

export default function VerifyEmail({
  name,
  verificationUrl
}: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your Crafty Keepsakes account</Preview>

      <Body style={{
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <Container style={{
          backgroundColor: '#ffffff',
          padding: '32px',
          margin: '30px auto',
          borderRadius: '8px',
          maxWidth: '500px'
        }}>

          <Heading style={{
            color: '#333333',
            textAlign: 'center'
          }}>
            Welcome to Crafty Keepsakes!
          </Heading>

          <Text>
            Hi {name},
          </Text>

          <Text>
            Thanks for creating an account with us.
            Before you can get started, we just need
            to verify your email address.
          </Text>

          <Button
            href={verificationUrl}
            style={{
              backgroundColor: '#333333',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}
          >
            Verify my email
          </Button>

          <Text>
            This link will expire in 24 hours.
          </Text>

          <Hr />

          <Text style={{
            color: '#888888',
            fontSize: '12px'
          }}>
            If you didn't create an account with
            Crafty Keepsakes, you can safely ignore
            this email.
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
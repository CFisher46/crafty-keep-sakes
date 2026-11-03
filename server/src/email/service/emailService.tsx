import { Resend } from 'resend';
import VerifyEmail from '../templates/VerifyEmail';

const resend = new Resend(
  process.env.RESEND_API_KEY
);

interface VerificationEmailOptions {
  email: string;
  name: string;
  verificationUrl: string;
}

export const sendVerificationEmail = async ({
  email,
  name,
  verificationUrl
}: VerificationEmailOptions) => {

  const { data, error } = await resend.emails.send({
    from: 'Crafty Keepsakes <accounts@craftykeepsakes.uk>',
    to: [email],
    subject: 'Verify your Crafty Keepsakes account',

    react: (
      <VerifyEmail
        name={name}
        verificationUrl={verificationUrl}
      />
    )
  });

  if (error) {
    console.error('Email sending failed:', error);
    throw new Error('Unable to send verification email');
  }

  return data;
};
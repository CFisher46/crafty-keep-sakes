import { Resend } from 'resend';
import type { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_SENDERS = {
  verify: 'Email Verification <verify@craftykeepsakes.uk>',
  orders: 'Crafty Keepsakes <orders@craftykeepsakes.uk>',
  notifications: 'Crafty Keepsakes <notifications@craftykeepsakes.uk>',
  support: 'Crafty Keepsakes <support@craftykeepsakes.uk>',
} as const;

type EmailSender = keyof typeof EMAIL_SENDERS;

interface EmailOptions {
  from: EmailSender;
  email: string;
  subject: string;
  template: ReactElement;
}

export const sendEmail = async ({
  from,
  email,
  subject,
  template,
}: EmailOptions) => {
  const { data, error } = await resend.emails.send({
    from: EMAIL_SENDERS[from],
    to: [email],
    subject,
    react: template,
  });

  if (error) {
    console.error('Email sending failed:', error);
    throw new Error('Unable to send email');
  }

  return data;
};
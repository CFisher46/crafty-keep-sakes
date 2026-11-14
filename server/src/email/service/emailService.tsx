import { Resend } from 'resend';
import type { ReactElement } from 'react';

const EMAIL_SENDERS = {
  verify: process.env.RESEND_VERIFICATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Email Verification <verify@craftykeepsakes.uk>',
  orders: 'Crafty Keepsakes <orders@craftykeepsakes.uk>',
  notifications: 'Crafty Keepsakes <notifications@craftykeepsakes.uk>',
  support: 'Crafty Keepsakes <support@craftykeepsakes.uk>',
  contact: process.env.RESEND_CONTACT_FROM_EMAIL || 'Crafty Keepsakes <enquires@craftykeepsakes.uk>',
} as const;

type EmailSender = keyof typeof EMAIL_SENDERS;

interface EmailOptions {
  from: EmailSender;
  email: string;
  subject: string;
  template: ReactElement;
  text: string;
  replyTo?: string;
}

export const sendEmail = async ({
  from,
  email,
  subject,
  template,
  text,
  replyTo,
}: EmailOptions) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Email provider is not configured');
    throw new Error('Email provider is not configured');
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: EMAIL_SENDERS[from],
    to: [email],
    subject: subject,
    react: template,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error('Email sending failed:', error.name);
    throw new Error('Unable to send email');
  }

  return data;
};
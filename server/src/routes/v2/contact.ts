import { createElement } from 'react';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendEmail } from '../../email/service/emailService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+(). -]+$/;
const RECIPIENT = 'craftykeepsakesprints@gmail.com';

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function createContactRouter(): Router {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many enquiries. Please try again later.' },
  });

  router.post('/', limiter, async (req, res) => {
    const body: unknown = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Please check your enquiry and try again.' });
      return;
    }
    const fields = body as Record<string, unknown>;
    const { name, email, telephone, eventDate, enquiry, website } = fields;
    if (typeof name !== 'string' || typeof email !== 'string' || typeof telephone !== 'string' ||
        typeof eventDate !== 'string' || typeof enquiry !== 'string' || typeof website !== 'string') {
      res.status(400).json({ error: 'Please check your enquiry and try again.' });
      return;
    }
    if (website.trim()) {
      res.status(400).json({ error: 'Unable to submit your enquiry.' });
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = telephone.trim();
    const cleanDate = eventDate.trim();
    const cleanEnquiry = enquiry.trim();
    if (!cleanName || cleanName.length > 120 || [...cleanName].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
      res.status(400).json({ error: 'Please enter a valid name (up to 120 characters).' });
      return;
    }
    if (!cleanEmail && !cleanPhone) {
      res.status(400).json({ error: 'Please provide an email address or telephone number.' });
      return;
    }
    if (cleanEmail && (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail))) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (cleanPhone && (cleanPhone.length > 30 || !PHONE_PATTERN.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 7)) {
      res.status(400).json({ error: 'Please enter a valid telephone number.' });
      return;
    }
    if (cleanDate && !validDate(cleanDate)) {
      res.status(400).json({ error: 'Please enter a valid event date.' });
      return;
    }
    if (!cleanEnquiry || cleanEnquiry.length > 5000) {
      res.status(400).json({ error: 'Please enter your enquiry (up to 5000 characters).' });
      return;
    }

    const text = [
      `Name: ${cleanName}`,
      `Email: ${cleanEmail || 'Not provided'}`,
      `Telephone: ${cleanPhone || 'Not provided'}`,
      `Wedding or event date: ${cleanDate || 'Not provided'}`,
      '',
      'Enquiry:',
      cleanEnquiry,
    ].join('\n');

    try {
      await sendEmail({
        from: 'contact',
        email: RECIPIENT,
        subject: 'New Crafty Keep-Sakes enquiry',
        template: createElement('div', { style: { whiteSpace: 'pre-wrap' } }, text),
        text,
        ...(cleanEmail ? { replyTo: cleanEmail } : {}),
      });
      res.status(200).json({ message: 'Your enquiry has been sent.' });
    } catch {
      console.error('Contact enquiry email failed');
      res.status(503).json({ error: 'Unable to send your enquiry. Please try again later.' });
    }
  });
  return router;
}

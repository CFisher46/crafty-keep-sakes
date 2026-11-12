import { Box, Text, TextArea, TextInput } from 'grommet';
import { useRef, useState, type FormEvent } from 'react';
import { buildApiUrl } from '../../api/apiPath';
import { ui } from '../../helpers/theme';
import { isValidEmail } from '../../helpers/userValidation';
import ActionButton from '../landingPage/components/ActionButton';

const initialForm = { name: '', email: '', telephone: '', eventDate: '', enquiry: '', website: '' };

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const update = (field: keyof typeof initialForm, value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    setSuccess(false);
    const name = form.name.trim();
    const email = form.email.trim();
    const telephone = form.telephone.trim();
    const enquiry = form.enquiry.trim();
    if (!name || name.length > 120 || Array.from(name).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
      setError('Please enter a valid name (up to 120 characters).');
      return;
    }
    if (!email && !telephone) {
      setError('Please provide an email address or telephone number.');
      return;
    }
    if (email && (email.length > 254 || !isValidEmail(email))) {
      setError('Please enter a valid email address.');
      return;
    }
    if (telephone && (telephone.length > 30 || !/^[0-9+(). -]+$/.test(telephone) || telephone.replace(/\D/g, '').length < 7)) {
      setError('Please enter a valid telephone number.');
      return;
    }
    if (!enquiry || enquiry.length > 5000) {
      setError('Please enter your enquiry (up to 5000 characters).');
      return;
    }
    inFlight.current = true;
    setSending(true);
    try {
      const response = await fetch(buildApiUrl('contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name, email, telephone, enquiry }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(typeof result.error === 'string' ? result.error : 'Unable to send your enquiry. Please try again later.');
        return;
      }
      setForm(initialForm);
      setSuccess(true);
    } catch (reason) {
      console.error('Contact enquiry failed:', reason);
      setError('Unable to send your enquiry. Please try again later.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <Box width={{ max: '700px' }} fill="horizontal" alignSelf="center" pad={{ vertical: 'large', horizontal: 'medium' }} gap="medium">
      <Text as="h1" margin="none" style={{ fontFamily: ui.serif, color: ui.ink, fontSize: '32px' }}>Contact us</Text>
      <Text style={{ color: ui.muted }}>Tell us about your enquiry. Please provide an email address or telephone number so we can contact you.</Text>
      {success && <Text role="status">Your enquiry has been sent. Thank you for getting in touch.</Text>}
      {error && <Text role="alert" color="status-critical">{error}</Text>}
      <form onSubmit={submit} noValidate>
        <Box gap="medium">
          <Box gap="xsmall">
            <label htmlFor="contact-name">Name (required)</label>
            <TextInput id="contact-name" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Box>
          <Box gap="xsmall">
            <label htmlFor="contact-email">Email address</label>
            <TextInput id="contact-email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Box>
          <Box gap="xsmall">
            <label htmlFor="contact-telephone">Telephone number</label>
            <TextInput id="contact-telephone" type="tel" autoComplete="tel" maxLength={30} value={form.telephone} onChange={(e) => update('telephone', e.target.value)} />
          </Box>
          <Box gap="xsmall">
            <label htmlFor="contact-date">Wedding or event date (optional)</label>
            <TextInput id="contact-date" type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} />
          </Box>
          <Box gap="xsmall">
            <label htmlFor="contact-enquiry">Your enquiry (required)</label>
            <TextArea id="contact-enquiry" maxLength={5000} rows={6} value={form.enquiry} onChange={(e) => update('enquiry', e.target.value)} />
          </Box>
          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
            <label htmlFor="contact-website">Leave this field empty</label>
            <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
          <ActionButton type="submit" label={sending ? 'Sending...' : 'Send enquiry'} onClick={() => undefined} disabled={sending} fixed />
        </Box>
      </form>
    </Box>
  );
}

import { Heading, Hr, Text } from 'react-email';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';

export interface ContactEnquiryProps {
  name: string;
  email: string;
  telephone: string;
  eventDate: string;
  enquiry: string;
}

export default function ContactEnquiry({ name, email, telephone, eventDate, enquiry }: ContactEnquiryProps) {
  return (
    <EmailLayout preview="A new enquiry has been submitted">
      <EmailHeader />
      <Heading as="h2" style={{ color: '#2B2623', fontFamily: 'Georgia, serif', fontWeight: 400 }}>
        New contact enquiry
      </Heading>
      <Text><strong>Name:</strong> {name}</Text>
      <Text><strong>Email:</strong> {email || 'Not provided'}</Text>
      <Text><strong>Telephone:</strong> {telephone || 'Not provided'}</Text>
      <Text><strong>Wedding or event date:</strong> {eventDate || 'Not provided'}</Text>
      <Hr style={{ borderColor: '#E4DDD3' }} />
      <Text><strong>Enquiry</strong></Text>
      <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{enquiry}</Text>
    </EmailLayout>
  );
}

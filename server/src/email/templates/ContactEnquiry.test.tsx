import { renderToStaticMarkup } from 'react-dom/server';
import ContactEnquiry from './ContactEnquiry';

describe('contact enquiry email', () => {
  it('renders the shared branding and escapes every enquiry field', () => {
    const html = renderToStaticMarkup(ContactEnquiry({
      name: '<Test>',
      email: 'person@example.com',
      telephone: '+44 123456789',
      eventDate: '2027-06-12',
      enquiry: 'First line\n<script>alert(1)</script>',
    }));
    expect(html).toContain('Crafty Keepsakes');
    expect(html).toContain('New contact enquiry');
    expect(html).toContain('&lt;Test&gt;');
    expect(html).toContain('person@example.com');
    expect(html).toContain('+44 123456789');
    expect(html).toContain('2027-06-12');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('First line\n');
    expect(html).not.toContain("didn&#x27;t create an account");
  });

  it('shows missing optional contact fields explicitly', () => {
    const html = renderToStaticMarkup(ContactEnquiry({
      name: 'Customer',
      email: '',
      telephone: '1234567',
      eventDate: '',
      enquiry: 'Please call me.',
    }));
    expect(html.match(/Not provided/g)).toHaveLength(2);
  });
});

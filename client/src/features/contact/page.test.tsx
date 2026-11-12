import { fireEvent, render, screen } from '@testing-library/react';
import ContactPage from './page';

describe('ContactPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  const fillRequired = () => {
    fireEvent.change(screen.getByLabelText('Name (required)'), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText('Your enquiry (required)'), { target: { value: 'Please contact me.' } });
  };

  it('accepts a telephone-only enquiry and submits it without authentication', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<ContactPage />);
    fillRequired();
    fireEvent.change(screen.getByLabelText('Telephone number'), { target: { value: '+44 1234 567890' } });
    fireEvent.change(screen.getByLabelText('Wedding or event date (optional)'), { target: { value: '2027-06-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your enquiry has been sent');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v2/contact'), expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('+44 1234 567890'),
    }));
  });

  it('requires at least one contact method', () => {
    render(<ContactPage />);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(screen.getByRole('alert')).toHaveTextContent('email address or telephone number');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['Email address', 'bad-email', 'valid email'],
    ['Telephone number', '123letters', 'valid telephone'],
  ])('validates %s', (label, value, message) => {
    render(<ContactPage />);
    fillRequired();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows a server error and preserves the enquiry', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Too many enquiries. Please try again later.' }),
    });
    render(<ContactPage />);
    fillRequired();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many enquiries');
    expect(screen.getByLabelText('Your enquiry (required)')).toHaveValue('Please contact me.');
  });
});

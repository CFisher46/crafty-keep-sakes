import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import PageFooter from './footer';

describe('Footer policies', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['PDF content'], { type: 'application/pdf' }),
    });
    URL.createObjectURL = jest.fn(() => 'blob:policy');
    URL.revokeObjectURL = jest.fn();
  });

  it.each([
    ['Terms & Conditions', 'Terms and Conditions of Sale.pdf'],
    ['Shipping & Delivery', 'Shipping and Delivery Policy.pdf'],
    ['Data Protection', 'Data Protection Policy.pdf'],
    ['Returns & Refunds', 'Returns and Refunds Policy.pdf'],
  ])('opens %s using its PDF and offers a new-tab fallback', async (title, fileName) => {
    render(<PageFooter />);
    fireEvent.click(screen.getByRole('button', { name: title }));

    expect(await screen.findByTitle(`${title} PDF`)).toHaveAttribute('src', 'blob:policy');
    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
    const url = `/policies/${encodeURIComponent(fileName)}`;
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(screen.getByRole('link', { name: `open ${title} in a new tab` })).toHaveAttribute('href', url);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: title }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:policy'));
  });

  it.each([
    { ok: false, status: 404 },
    { ok: true, blob: async () => new Blob(['not a PDF'], { type: 'text/html' }) },
    { ok: true, blob: async () => new Blob([], { type: 'application/pdf' }) },
  ])('shows an error when the policy cannot be loaded', async (response) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      (global.fetch as jest.Mock).mockResolvedValue(response);
      render(<PageFooter />);
      fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this policy');
      expect(screen.getAllByRole('link', { name: 'open Terms & Conditions in a new tab' }).length).toBeGreaterThan(0);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

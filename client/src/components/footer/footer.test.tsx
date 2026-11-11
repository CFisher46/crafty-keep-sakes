import { fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import PageFooter from './footer';

describe('Footer policies', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('loads the shared terms file and closes the policy modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => 'Shared terms text',
    });

    render(<PageFooter />);
    fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));

    expect(await screen.findByText('Shared terms text')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Terms & Conditions' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/policies\/terms-and-conditions\.txt$/),
      expect.objectContaining({ signal: expect.anything() })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Shared terms text'));
  });

  it.each([
    ['Shipping & Delivery', 'shipping-and-delivery.txt'],
    ['Data Protection', 'data-protection.txt'],
    ['Returns & Refunds', 'returns-and-refunds.txt'],
  ])('opens %s using its own text file', async (title, fileName) => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => `${title} policy text`,
    });

    render(<PageFooter />);
    fireEvent.click(screen.getByRole('button', { name: title }));

    expect(await screen.findByText(`${title} policy text`)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/policies/${fileName}`),
      expect.objectContaining({ signal: expect.anything() })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitForElementToBeRemoved(() => screen.queryByText(`${title} policy text`));
  });

  it('shows an error when the policy cannot be loaded', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      render(<PageFooter />);
      fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this policy');
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

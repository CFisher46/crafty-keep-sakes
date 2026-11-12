import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import CreateNewProduct from './createProduct';

describe('Create product quantity', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insertId: 1 }),
    });
  });

  afterEach(async () => {
    cleanup();
    // Grommet keeps an animated copy of a closed layer briefly after unmount.
    await waitFor(() => {
      expect(screen.queryByText('Product added successfully.')).not.toBeInTheDocument();
    });
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText('Product Name:'), { target: { value: 'Mug' } });
    fireEvent.change(screen.getByLabelText('Category:'), { target: { value: 'Mugs' } });
    fireEvent.change(screen.getByLabelText('Description:'), { target: { value: 'Handmade' } });
    fireEvent.change(screen.getByLabelText('Price:'), { target: { value: '10' } });
  };

  it('creates a product with zero as the default when quantity is omitted', async () => {
    renderWithProviders(<CreateNewProduct />);
    fillRequiredFields();
    expect(screen.getByLabelText('Quantity (optional):')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));

    expect(await screen.findByText('Product added successfully.')).toBeInTheDocument();
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
      product_name: 'Mug',
      quantity: 0,
    });
  });

  it('rejects invalid quantities when provided', () => {
    renderWithProviders(<CreateNewProduct />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Quantity (optional):'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('preserves an explicitly supplied stock quantity', async () => {
    renderWithProviders(<CreateNewProduct />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Quantity (optional):'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(await screen.findByText('Product added successfully.')).toBeInTheDocument();
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).quantity).toBe(8);
  });

  it('prevents duplicate submissions while creation is pending and resets the form after success', async () => {
    let resolveRequest!: (response: { ok: boolean; json: () => Promise<{ insertId: number }> }) => void;
    (global.fetch as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderWithProviders(<CreateNewProduct />);
    fillRequiredFields();
    const button = screen.getByRole('button', { name: 'Create Product' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    resolveRequest({ ok: true, json: async () => ({ insertId: 1 }) });
    expect(await screen.findByText('Product added successfully.')).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name:')).toHaveValue('');
  });

  it('reports a saved product when image upload fails and does not create it again', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ insertId: 42 }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Upload failed' }) });
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderWithProviders(<CreateNewProduct />);
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText('Product images'), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
      expect(await screen.findByText('Product added successfully.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('The product was added, but its images could not be uploaded');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('/42/images/upload');
      expect(screen.getByLabelText('Product Name:')).toHaveValue('');
    } finally {
      log.mockRestore();
    }
  });

  it('explains an unsupported file before creating a product and allows correcting it', async () => {
    renderWithProviders(<CreateNewProduct />);
    fillRequiredFields();
    const input = screen.getByLabelText('Product images');
    fireEvent.change(input, { target: { files: [new File(['test'], 'test.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Only JPG, PNG, WEBP or GIF images are allowed.');
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(await screen.findByText('Product added successfully.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('warns when an upload fails with an HTML response after product creation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ insertId: 42 }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new SyntaxError('Not JSON'); } });
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderWithProviders(<CreateNewProduct />);
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText('Product images'), {
        target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('The product was added, but its images could not be uploaded');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
    }
  });

  it('surfaces an unconfirmed creation instead of silently failing', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failed'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderWithProviders(<CreateNewProduct />);
      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Check the product list before trying again');
      expect(screen.getByLabelText('Product Name:')).toHaveValue('Mug');
    } finally {
      log.mockRestore();
    }
  });
});

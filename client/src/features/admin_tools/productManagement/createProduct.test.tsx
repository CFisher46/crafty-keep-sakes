import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import CreateNewProduct from './createProduct';

describe('Create product quantity', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insertId: 1 }),
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
});

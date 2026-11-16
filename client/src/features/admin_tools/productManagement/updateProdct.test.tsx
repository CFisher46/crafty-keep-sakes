import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import UpdateProduct from './updateProdct';

it('blocks saving an unsupported image before updating the product', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      data: [{
        id: '1', product_name: 'Mug', category: 'Mugs', description: 'Handmade',
        price: 10, quantity: 1, on_sale: false, is_live: false, sale_percent: 0, images: '',
      }],
    }),
  });

  renderWithProviders(<UpdateProduct />);
  fireEvent.click(await screen.findByPlaceholderText('Select a product...'));
  fireEvent.click(await screen.findByText('1 — Mug (Mugs)'));
  fireEvent.click(screen.getByRole('button', { name: 'Load Product Details' }));
  fireEvent.change(screen.getByLabelText('Add new product images'), {
    target: { files: [new File(['test'], 'test.txt', { type: 'text/plain' })] },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Only JPG, PNG, WEBP or GIF images are allowed.');
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  scrollTo.mockRestore();
});

it('assigns a tier to an existing product and shows it when reopened', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      json: async () => ({
        data: [{ id: '1', product_name: 'Mug', category: 'Mugs', description: 'Handmade', price: 10, quantity: 1, on_sale: false, is_live: false, sale_percent: 0, images: '', delivery_tier: null }],
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Product updated' }) });
  try {
    renderWithProviders(<UpdateProduct />);
    fireEvent.click(await screen.findByPlaceholderText('Select a product...'));
    fireEvent.click(await screen.findByText('1 — Mug (Mugs)'));
    fireEvent.click(screen.getByRole('button', { name: 'Load Product Details' }));
    fireEvent.click(screen.getByLabelText('Delivery Tier:'));
    fireEvent.click(await screen.findByText('Largest'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({ delivery_tier: 'largest' });
    fireEvent.click(await screen.findByPlaceholderText('Select a product...'));
    fireEvent.click(await screen.findByText('1 — Mug (Mugs)'));
    fireEvent.click(screen.getByRole('button', { name: 'Load Product Details' }));
    expect(within(screen.getByLabelText('Delivery Tier:')).getByDisplayValue('Largest')).toBeInTheDocument();
  } finally {
    scrollTo.mockRestore();
  }
});

describe('numeric product updates', () => {
  beforeEach(() => {
    jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: '1', product_name: 'Mug', category: 'Mugs', description: 'Handmade', price: 10, quantity: 1, on_sale: false, is_live: false, sale_percent: 0, images: '', delivery_tier: 'small' }],
        }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({ message: 'Product updated' }) });
  });

  afterEach(() => jest.restoreAllMocks());

  const loadProduct = async () => {
    renderWithProviders(<UpdateProduct />);
    fireEvent.click(await screen.findByPlaceholderText('Select a product...'));
    fireEvent.click(await screen.findByText('1 — Mug (Mugs)'));
    fireEvent.click(screen.getByRole('button', { name: 'Load Product Details' }));
  };

  it.each([
    ['Price:', 'price', '10.', '10.05', 10.05],
    ['Price:', 'price', '.', '.50', 0.5],
    ['Sale Percent:', 'sale_percent', '0.', '0.50', 0.5],
  ])('allows decimal input for %s and saves the numeric value', async (label, field, partial, complete, expected) => {
    await loadProduct();
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: partial } });
    expect(input).toHaveValue(partial);
    fireEvent.change(input, { target: { value: complete } });
    expect(input).toHaveValue(complete);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({ [field]: expected });
  });

  it.each([
    ['Price:', '', 'Enter a valid number.'],
    ['Sale Percent:', '.', 'Enter a valid number.'],
    ['Quantity:', '1.5', 'Enter a whole number.'],
  ])('blocks invalid %s without replacing it with zero', async (label, value, message) => {
    await loadProduct();
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(input).toHaveValue(value);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: '2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});

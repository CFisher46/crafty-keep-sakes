import { fireEvent, screen } from '@testing-library/react';
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

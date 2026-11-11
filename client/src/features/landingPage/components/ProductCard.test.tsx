import { fireEvent, render, screen } from '@testing-library/react';
import ProductCard from './ProductCard';
import type { Product } from '../../../types';

const product: Product = {
  id: '1', product_name: 'Mug', description: 'A mug', price: 10,
  category: 'Mugs', quantity: 0, on_sale: true, sale_percent: 20,
  is_live: true, images: '[]',
};

it('adds one product directly from the landing page card without a quantity input', () => {
  const onAddToCart = jest.fn();
  render(<ProductCard product={product} onOpenModal={jest.fn()} onAddToCart={onAddToCart} />);
  expect(screen.queryByLabelText('Quantity for Mug')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Basket' }));
  expect(onAddToCart).toHaveBeenCalledWith(product);
});

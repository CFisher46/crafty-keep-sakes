import { render, screen, fireEvent } from '@testing-library/react';
import ProductModal from './page';
import { Product } from '../../../types';

const product = {
  id: 1,
  product_name: 'Tea Mug',
  description: 'A mug',
  price: 10,
  on_sale: false,
  sale_percent: 0,
  category: 'Kitchen',
  images: JSON.stringify(['a.jpg', 'b.jpg', 'c.jpg']),
} as unknown as Product;

describe('ProductModal', () => {
  it('shows a thumbnail per image and swaps the preview when one is clicked', () => {
    render(<ProductModal title="Tea Mug" values={product} />);

    expect(screen.getAllByAltText(/Product thumbnail/)).toHaveLength(3);
    expect(screen.getByAltText('Product Image 1')).toHaveAttribute('src', 'a.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'View image 3' }));

    expect(screen.getByAltText('Product Image 3')).toHaveAttribute('src', 'c.jpg');
  });

  it('hides the thumbnail row when there is only one image', () => {
    render(
      <ProductModal
        title="Tea Mug"
        values={{ ...product, images: JSON.stringify(['a.jpg']) } as unknown as Product}
      />
    );

    expect(screen.queryByAltText(/Product thumbnail/)).not.toBeInTheDocument();
    expect(screen.getByAltText('Product Image 1')).toBeInTheDocument();
  });

  it('calls onClose from the X button', () => {
    const onClose = jest.fn();
    render(<ProductModal title="Tea Mug" values={product} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAddToBasket with the product', () => {
    const onAddToBasket = jest.fn();
    render(<ProductModal title="Tea Mug" values={product} onAddToBasket={onAddToBasket} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Basket' }));

    expect(onAddToBasket).toHaveBeenCalledWith(product);
  });
});

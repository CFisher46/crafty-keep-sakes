import React from 'react';
import { Box, Card, CardBody, Text, Button } from 'grommet';
import { Product } from '../../../types';
import { buttonStyles } from '../../../helpers/formatting';

interface ProductCardProps {
  product: Product;
  onOpenModal: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  hovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenModal,
  onAddToCart,
  hovered = false,
  onMouseEnter,
  onMouseLeave,
}) => {
  const salePrice = (p: Product) => p.price * (1 - p.sale_percent / 100);

  const parseProductImages = (images: Product['images']) => {
    if (Array.isArray(images)) return images;
    if (typeof images !== 'string' || !images.trim()) return [];
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  };

  const images = parseProductImages(product.images);

  return (
    <Card
      background="white"
      pad="small"
      border={{ color: '#f0e6ec', size: 'xsmall' }}
      round="small"
      style={{
        display: 'inline-block',
        width: '220px',
        minWidth: '220px',
        flexShrink: 0,
        boxShadow: hovered ? '0px 6px 16px rgba(0, 0, 0, 0.12)' : '0px 2px 6px rgba(0, 0, 0, 0.04)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardBody onClick={() => onOpenModal(product)} style={{ cursor: 'pointer' }}>
        <Box
          height="140px"
          width="100%"
          overflow="hidden"
          round="xsmall"
          background="#fafafa"
          align="center"
          justify="center"
          margin={{ bottom: 'small' }}
        >
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={product.product_name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Text size="small" color="dark-4">No Image</Text>
          )}
        </Box>

        <Box gap="xxsmall">
          <Text weight="bold" size="medium" truncate>
            {product.product_name}
          </Text>

          <Text size="xsmall" color="dark-4" truncate>
            {product.description}
          </Text>

          <Box direction="row" align="center" gap="xsmall" margin={{ top: 'xsmall' }}>
            {product.on_sale ? (
              <>
                <Text size="small" style={{ textDecoration: 'line-through' }} color="dark-4">
                  £{product.price.toFixed(2)}
                </Text>
                <Text size="small" weight="bold" color="status-critical">
                  £{salePrice(product).toFixed(2)}
                </Text>
                <Box
                  background="#fce5f5"
                  pad={{ horizontal: 'xxsmall', vertical: '2px' }}
                  round="xsmall"
                >
                  <Text size="xsmall" weight="bold" color="brand">
                    {product.sale_percent}% off
                  </Text>
                </Box>
              </>
            ) : (
              <Text size="small" weight="bold">
                £{product.price.toFixed(2)}
              </Text>
            )}
          </Box>
        </Box>
      </CardBody>

      <Box margin={{ top: 'small' }}>
        <Button
          label="Add to Basket"
          style={buttonStyles.default}
          onClick={() => onAddToCart(product)}
        />
      </Box>
    </Card>
  );
};

export default ProductCard;

import React from 'react';
import { Box, Card, CardBody, Text } from 'grommet';
import { Product } from '../../../types';
import { ui } from '../../../helpers/theme';
import ActionButton from './ActionButton';

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
      border={{ color: ui.line, size: 'xsmall' }}
      round="xsmall"
      style={{
        display: 'inline-block',
        width: '220px',
        minWidth: '220px',
        flexShrink: 0,
        boxShadow: hovered ? '0px 8px 20px rgba(43, 38, 35, 0.10)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardBody onClick={() => onOpenModal(product)} style={{ cursor: 'pointer' }}>
        <Box
          height="160px"
          width="100%"
          overflow="hidden"
          round="none"
          background={ui.sand}
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
          <Text size="medium" truncate style={{ fontFamily: ui.serif }}>
            {product.product_name}
          </Text>

          <Text size="xsmall" color="dark-4" truncate>
            {product.description}
          </Text>

          <Box direction="row" align="center" gap="small" margin={{ top: 'xsmall' }} wrap>
            {product.on_sale ? (
              <>
                <Text size="small" style={{ textDecoration: 'line-through' }} color="dark-4">
                  £{product.price.toFixed(2)}
                </Text>
                <Text size="small" weight="bold" color="status-critical">
                  £{salePrice(product).toFixed(2)}
                </Text>
                <Box
                  background={ui.sand}
                  pad={{ horizontal: 'xxsmall', vertical: '2px' }}
                  round="xsmall"
                >
                  <Text size="xsmall" weight="bold" color="dark-2">
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
        <ActionButton
          label="Add to Basket"
          secondary
          onClick={() => onAddToCart(product)}
        />
      </Box>
    </Card>
  );
};

export default ProductCard;

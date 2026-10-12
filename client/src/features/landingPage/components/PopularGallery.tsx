import React, { useState } from 'react';
import { Box, Text } from 'grommet';
import { Product } from '../../../types';

interface PopularGalleryProps {
  products: Product[];
  onOpenModal: (product: Product) => void;
}

const getImage = (images: Product['images']): string | null => {
  if (Array.isArray(images)) return images[0] ?? null;
  if (typeof images !== 'string' || !images.trim()) return null;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed[0] ?? null : null;
  } catch {
    return null;
  }
};

const price = (p: Product) =>
  p.on_sale ? p.price * (1 - p.sale_percent / 100) : p.price;

export const PopularGallery: React.FC<PopularGalleryProps> = ({ products, onOpenModal }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <Box gap="medium" fill>
      <Box>
        <Text size="large" weight="bold">Most Popular</Text>
        <Text size="small" color="dark-4">Our five best-selling keepsakes</Text>
      </Box>

      {products.length === 0 ? (
        <Text size="small" color="dark-4">No sales yet - check back soon!</Text>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, minmax(110px, 1fr))',
            gap: '10px',
            flex: 1,
            minHeight: '320px',
          }}
        >
          {products.map((product, index) => {
            const image = getImage(product.images);
            const featured = index === 0;
            const hovered = hoveredId === product.id;
            return (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={`View ${product.product_name}`}
                onClick={() => onOpenModal(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenModal(product);
                }}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  gridColumn: featured ? 'span 2' : 'span 1',
                  gridRow: featured ? 'span 2' : 'span 1',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#FFFCC9',
                  boxShadow: hovered
                    ? '0px 6px 16px rgba(0, 0, 0, 0.15)'
                    : '0px 2px 6px rgba(0, 0, 0, 0.06)',
                  transition: 'box-shadow 0.25s ease',
                }}
              >
                {image ? (
                  <img
                    src={image}
                    alt={product.product_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transform: hovered ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 0.35s ease',
                    }}
                  />
                ) : (
                  <Box fill align="center" justify="center">
                    <Text size="small" color="dark-4">No Image</Text>
                  </Box>
                )}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: featured ? '24px 14px 12px' : '16px 8px 8px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                    color: 'white',
                  }}
                >
                  <Text size={featured ? 'medium' : 'small'} weight="bold" color="white" truncate>
                    {product.product_name}
                  </Text>
                  <Text size="xsmall" color="white">
                    £{price(product).toFixed(2)}
                  </Text>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: '#F4C2C2',
                    color: '#1a1a1a',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Box>
  );
};

export default PopularGallery;

import { useState } from 'react';
import { Box, Text, Image, Button } from 'grommet';
import { FormClose } from 'grommet-icons';
import { Product } from '../../../types';
import { ui } from '../../../helpers/theme';
import ActionButton from '../../landingPage/components/ActionButton';

function ProductModal({
  title,
  values,
  onClose,
  onAddToBasket,
}: {
  title: string;
  values?: Product;
  onClose?: () => void;
  onAddToBasket?: (product: Product) => void;
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const product = values;
  const salePrice = (product: Product) => product.price * (1 - product.sale_percent / 100);


  if (!product) {
    return null;
  }

  const images: string[] = product.images
    ? typeof product.images === 'string'
      ? JSON.parse(product.images)
      : product.images
    : [];

  const tag = {
    fontSize: '11px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: ui.muted,
  };
  const categories = product.category
    ? product.category.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <Box background="white" style={{ position: 'relative' }}>
      {onClose && (
        <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          <Button plain icon={<FormClose />} a11yTitle="Close" onClick={onClose} style={{ padding: 8 }} />
        </Box>
      )}
      <Box direction="row" wrap>
        <Box
          flex
          basis="1/2"
          style={{ minWidth: '280px' }}
          background={ui.sand}
          pad="medium"
          gap="small"
        >
          {images.length > 0 ? (
            <>
              <Box height="medium" width="100%" overflow="hidden">
                <Image
                  src={images[selectedImage] ?? images[0]}
                  fit="contain"
                  alt={`Product Image ${selectedImage + 1}`}
                />
              </Box>
              {images.length > 1 && (
                <Box direction="row" gap="xsmall" wrap justify="center">
                  {images.map((image, index) => (
                    <Button
                      key={index}
                      a11yTitle={`View image ${index + 1}`}
                      onClick={() => setSelectedImage(index)}
                      plain
                    >
                      <Box
                        height="xsmall"
                        width="xsmall"
                        overflow="hidden"
                        background="white"
                        style={{
                          border: `1px solid ${index === selectedImage ? ui.ink : ui.line}`,
                          opacity: index === selectedImage ? 1 : 0.7,
                          borderRadius: '2px',
                        }}
                      >
                        <Image
                          src={image}
                          fit="cover"
                          alt={`Product thumbnail ${index + 1}`}
                        />
                      </Box>
                    </Button>
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Box height="medium" align="center" justify="center">
              <Text color={ui.muted}>No Image</Text>
            </Box>
          )}
        </Box>

        <Box
          flex
          basis="1/2"
          style={{ minWidth: '280px' }}
          pad={{ vertical: 'large', horizontal: 'large' }}
          gap="medium"
          justify="between"
        >
          <Box gap="small">
            <Text style={tag}>{title}</Text>
            <Text
              as="div"
              style={{
                fontFamily: ui.serif,
                fontSize: '30px',
                lineHeight: 1.2,
                color: ui.ink,
              }}
            >
              {product.product_name}
            </Text>
            {product.on_sale ? (
              <Box direction="row" gap="small" align="baseline" wrap>
                <Text size="large" weight="bold" color="status-critical">
                  £{salePrice(product).toFixed(2)} ({product.sale_percent}% off)
                </Text>
                <Text size="small" color={ui.muted} style={{ textDecoration: 'line-through' }}>
                  RRP:£{product.price}
                </Text>
              </Box>
            ) : (
              <Text size="large" color={ui.ink}>RRP: £{product.price}</Text>
            )}
            <Box style={{ borderTop: `1px solid ${ui.line}` }} margin={{ vertical: 'xsmall' }} />
            <Text color={ui.muted} style={{ lineHeight: 1.6 }}>
              Description: {product.description}
            </Text>
            {categories.length > 0 && (
              <Box direction="row" gap="xsmall" wrap align="center" margin={{ top: 'xsmall' }}>
                <Text style={tag}>Category:</Text>
                {categories.map((c) => (
                  <Text
                    key={c}
                    size="small"
                    style={{
                      border: `1px solid ${ui.line}`,
                      padding: '2px 10px',
                      borderRadius: '2px',
                      color: ui.ink,
                    }}
                  >
                    {c}
                  </Text>
                ))}
              </Box>
            )}
          </Box>

          {onAddToBasket && (
            <Box direction="row">
              <ActionButton label="Add to Basket" onClick={() => onAddToBasket(product)} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
export default ProductModal;

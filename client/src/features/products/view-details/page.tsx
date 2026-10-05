import { useState } from 'react';
import { Box, Text, Image, Button } from 'grommet';
import { FormClose } from 'grommet-icons';
import { Product } from '../../../types';
import { buttonStyles } from '../../../helpers/formatting';

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

  return (
    <Box pad="medium" gap="medium">
      <Box direction="row" justify="between" align="center">
        <Text>{title}</Text>
        {onClose && (
          <Button
            icon={<FormClose />}
            a11yTitle="Close"
            onClick={onClose}
          />
        )}
      </Box>

      {/* Gallery Section */}
      {images.length > 0 && (
        <Box gap="small">
          <Box height="medium" width="100%" overflow="hidden">
            <Image
              src={images[selectedImage] ?? images[0]}
              fit="contain"
              alt={`Product Image ${selectedImage + 1}`}
            />
          </Box>
          {images.length > 1 && (
            <Box direction="row" gap="small" wrap>
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
                    round="xsmall"
                    border={{
                      color: index === selectedImage ? 'brand' : 'light-4',
                      size: index === selectedImage ? 'small' : 'xsmall',
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
        </Box>
      )}

      {/* Product Details Section */}
      <Box gap="small">
        <Text size="xlarge" weight="bold">
          {product.product_name}
        </Text>
        <Text>Description: {product.description}</Text>
        {product.on_sale ? (
          <><Text size="small" style={{ textDecoration: 'line-through' }}>
            RRP:£{product.price}
          </Text>
            <Text size="small" color="status-critical">
              £{salePrice(product).toFixed(2)} ({product.sale_percent}% off)
            </Text></>
        ) : (
          <Text>RRP: £{product.price}</Text>
        )
        }
        <Text>Category: {product.category}</Text>
      </Box>

      <Box direction="row" gap="small" justify="end">
        {onAddToBasket && (
          <Button
            label="Add to Basket"
            style={buttonStyles.default}
            onClick={() => onAddToBasket(product)}
          />
        )}
      </Box>
    </Box>
  );
}
export default ProductModal;

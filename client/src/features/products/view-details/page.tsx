import { Box, Text, Image, Carousel } from 'grommet';
import { Product } from '../../../types';

function ProductModal({ title, values }: { title: string; values?: Product }) {
  const product = values;

  if (!product) {
    return null;
  }

  // Parse images if they are a string
  const images: string[] = product.images
    ? typeof product.images === 'string'
      ? JSON.parse(product.images)
      : product.images
    : [];

  return (
    <Box pad="medium" gap="medium">
      <Text>{title}</Text>

      {/* Gallery Section */}
      {images.length > 0 && (
        <Box height="medium" width="100%">
          <Carousel fill>
            {images.map((image, index) => (
              <Image
                key={index}
                src={image}
                fit="cover"
                alt={`Product Image ${index + 1}`}
              />
            ))}
          </Carousel>
        </Box>
      )}

      {/* Product Details Section */}
      <Box gap="small">
        <Text size="xlarge" weight="bold">
          {product.product_name}
        </Text>
        <Text>Description: {product.description}</Text>
        <Text>
          Price: £
          {typeof product.price === 'number' ? product.price.toFixed(2) : 'N/A'}
        </Text>
        <Text>Category: {product.category}</Text>
      </Box>
    </Box>
  );
}
export default ProductModal;

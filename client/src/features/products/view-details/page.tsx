import { Box, Text, Button, Image, Carousel } from 'grommet';
import { Product} from '../../../types';
import {useState} from "react";
import React from "react";


const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '800px',
    padding: '0',
    boxShadow: '0px 0px 20px rgb(45, 44, 45)',
  },
};

function ProductModal({ title, values }: { title: string; values?: Product }) {
  const product = values;

  if (!product) {
    return null;
  }

  // Parse images if they are a string
  const images: string[] = product.images
    ? typeof product.images === "string"
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
          {typeof product.price === "number"
            ? product.price.toFixed(2)
            : "N/A"}
        </Text>
        <Text>Category: {product.category}</Text>
      </Box>
    </Box>
  );
}
export default ProductModal;
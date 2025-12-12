import {
  Box,
  Card,
  Grid,
  TextInput,
  Text,
  Button,
  FileInput,
  FormField,
} from 'grommet';
import { Product } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { useState } from 'react';
import { createProduct } from '../../../store/products/productsThunks';
import { buttonStyles } from '../../../helpers/formatting';

const CreateNewProduct = () => {
  const dispatch = useAppDispatch();
  const requiredDetails: Partial<Product> = {
    id: '',
    category: '',
    description: '',
    price: 0,
    quantity: '',
    on_sale: '',
    product_name: '',
    is_live: '',
    sale_percent: '',
    images: '',
  };

  const handleCreateProduct = async () => {
    console.log(`Creating product with data:`, newProduct);
    try {
      await dispatch(createProduct(newProduct as Product)).unwrap();
      console.log('Product created successfully');
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const [newProduct, setNewProduct] =
    useState<Partial<Product>>(requiredDetails);

  return (
    <Card pad="small" background="light-2" elevation="small" overflow="auto">
      <Box pad="small" margin={{ bottom: 'medium' }}>
        <FileInput
          name="images"
          multiple
          onChange={(event) => {
            const files = event.target.files
              ? Array.from(event.target.files)
              : [];
            setNewProduct({
              ...newProduct,
              images: files.map((file) => file.name).join(','),
            });
          }}
        />
      </Box>
      <Grid
        columns={['1/2', '1/2']}
        gap="small"
        pad="small"
        style={{ maxHeight: '850px', overflowY: 'auto' }}
      >
        {Object.entries(newProduct)
          .filter(([key]) => key !== 'images')
          .map(([key, value], index) => (
            <Box key={index} direction="column" gap="xsmall">
              <Text
                size="small"
                weight="bold"
                style={{ textTransform: 'capitalize' }}
              >
                {key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
                :
              </Text>
              <TextInput
                placeholder={String(value)}
                size="small"
                style={{ fontSize: '12px' }}
              />
            </Box>
          ))}
        <Button
          label="Create Product"
          onClick={handleCreateProduct}
          style={buttonStyles.default}
        />
      </Grid>
    </Card>
  );
};

export default CreateNewProduct;

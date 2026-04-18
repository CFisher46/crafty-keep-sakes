import { Box, Card, Grid, TextInput, Text, Button, FileInput, Layer } from 'grommet';
import { Product } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { useState } from 'react';
import {
  createProduct,
  uploadProductImages,
} from '../../../store/products/productsThunks';
import { buttonStyles } from '../../../helpers/formatting';

const CreateNewProduct = () => {
  const dispatch = useAppDispatch();
  const requiredDetails: Product = {
    id: '',
    category: '',
    description: '',
    price: 0,
    quantity: 0,
    on_sale: false,
    product_name: '',
    is_live: false,
    sale_percent: 0,
    images: '',
  };

  const parseBoolean = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  };

  const numericFields = new Set<keyof Product>([
    'price',
    'quantity',
    'sale_percent',
  ]);
  const booleanFields = new Set<keyof Product>(['on_sale', 'is_live']);

  const getBlankRawValues = () =>
    Object.fromEntries(
      Object.keys(requiredDetails).map((key) => [key, ''])
    ) as Record<string, string>;

  const resetForm = () => {
    setNewProduct(requiredDetails);
    setSelectedImages([]);
    setRawInputValues(getBlankRawValues());
    setFileInputResetKey((prev) => prev + 1);
  };

  const handleInputChange = (key: keyof Product, rawValue: string) => {
    setRawInputValues((prev) => ({
      ...prev,
      [key]: rawValue,
    }));

    let parsedValue: Product[keyof Product] = rawValue;

    if (numericFields.has(key)) {
      const numericValue = Number(rawValue);
      parsedValue = Number.isFinite(numericValue) ? numericValue : 0;
    } else if (booleanFields.has(key)) {
      parsedValue = parseBoolean(rawValue);
    }

    setNewProduct((prev) => ({
      ...prev,
      [key]: parsedValue,
    }));
  };

  const handleCreateProduct = async () => {
    console.log(`Creating product with data:`, newProduct);
    try {
      const createResult = (await dispatch(
        createProduct(newProduct as Product)
      ).unwrap()) as { insertId?: string | number };

      const resolvedProductId = String(newProduct.id || createResult.insertId || '');

      if (selectedImages.length > 0 && resolvedProductId) {
        await dispatch(
          uploadProductImages({
            productId: resolvedProductId,
            files: selectedImages,
          })
        ).unwrap();
      }

      console.log('Product created successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const [newProduct, setNewProduct] = useState<Product>(requiredDetails);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [rawInputValues, setRawInputValues] = useState<Record<string, string>>(
    getBlankRawValues()
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);

  return (
    <>
      <Card pad="small" background="light-2" elevation="small" overflow="auto">
        <Box pad="small" margin={{ bottom: 'medium' }}>
          <FileInput
            key={fileInputResetKey}
            name="images"
            multiple
            onChange={(event) => {
              const files = event.target.files
                ? Array.from(event.target.files)
                : [];
              setSelectedImages(files);
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
                  value={rawInputValues[key] ?? String(value)}
                  placeholder={String(value)}
                  size="small"
                  style={{ fontSize: '12px' }}
                  onChange={(event) =>
                    handleInputChange(key as keyof Product, event.target.value)
                  }
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
      {showSuccessModal && (
        <Layer
          onEsc={() => {
            setShowSuccessModal(false);
            resetForm();
          }}
          onClickOutside={() => {
            setShowSuccessModal(false);
            resetForm();
          }}
        >
          <Box pad="medium" gap="medium" width="medium">
            <Text weight="bold">Product added successfully.</Text>
            <Button
              label="OK"
              onClick={() => {
                setShowSuccessModal(false);
                resetForm();
              }}
              style={buttonStyles.default}
            />
          </Box>
        </Layer>
      )}
    </>
  );
};

export default CreateNewProduct;

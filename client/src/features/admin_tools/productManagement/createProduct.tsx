
import {
  Box,
  Card,
  Grid,
  TextInput,
  Text,
  FileInput,
  Layer,
} from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { Product } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { useRef, useState } from 'react';
import { MAX_QUANTITY } from '../../../helpers/quantity';
import { IMAGE_ACCEPT, validateProductImages } from './imageValidation';
import {
  createProduct,
  uploadProductImages,
} from '../../../store/products/productsThunks';

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

  // Fields that must be populated before a product can be created
  const requiredFields = [
    'product_name',
    'category',
    'description',
    'price',
  ] as const;

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

  const [newProduct, setNewProduct] = useState<Product>(requiredDetails);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [rawInputValues, setRawInputValues] = useState<Record<string, string>>(
    getBlankRawValues()
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [quantityError, setQuantityError] = useState(false);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageWarning, setImageWarning] = useState('');
  const createInProgress = useRef(false);

  const resetForm = () => {
    setNewProduct(requiredDetails);
    setSelectedImages([]);
    setRawInputValues(getBlankRawValues());
    setQuantityError(false);
    setImageError('');
    setFileInputResetKey((prev) => prev + 1);
  };

  const handleInputChange = (key: keyof Product, rawValue: string) => {
    if (key === 'quantity') setQuantityError(false);
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
    if (createInProgress.current) return;
    createInProgress.current = true;
    setCreating(true);
    setCreationError('');
    let createResult: { insertId?: string | number };
    try {
      createResult = await dispatch(createProduct(newProduct)).unwrap() as { insertId?: string | number };
    } catch (error) {
      console.error('Failed to create product:', error);
      setCreationError('Could not confirm whether the product was created. Check the product list before trying again.');
      createInProgress.current = false;
      setCreating(false);
      return;
    }

    const resolvedProductId = String(createResult?.insertId || '');
    if (selectedImages.length > 0) {
      try {
        if (!resolvedProductId) throw new Error('Product ID missing from create response');
        await dispatch(uploadProductImages({ productId: resolvedProductId, files: selectedImages })).unwrap();
      } catch (error) {
        console.error('Product created but image upload failed:', error);
        setImageWarning('The product was added, but its images could not be uploaded. Do not create it again. Find it under Products > Update to add images.');
      }
    }
    resetForm();
    setShowSuccessModal(true);
    createInProgress.current = false;
    setCreating(false);
  };

  const handleCreateProductClick = () => {
    const validationError = validateProductImages(selectedImages);
    setImageError(validationError);
    if (validationError) return;
    const rawQuantity = rawInputValues.quantity.trim();
    const validQuantity = rawQuantity === '' ||
      (/^\d+$/.test(rawQuantity) && Number.isSafeInteger(Number(rawQuantity)) && Number(rawQuantity) <= MAX_QUANTITY);
    setQuantityError(!validQuantity);
    const missingFields = requiredFields.filter(
      (field) => rawInputValues[field]?.trim() === ''
    );

    if (missingFields.length > 0) {
      setShowValidationWarning(true);
      return;
    }

    if (!validQuantity) return;
    handleCreateProduct();
  };

  const getFieldLabel = (field: string) =>
    field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const missingFields = requiredFields.filter(
    (field) => rawInputValues[field]?.trim() === ''
  );

  return (
    <>
      <Card
        pad="small"
        background="white"
        elevation="none" round="none"
        overflow="auto"
      >
        <Box pad="small" margin={{ bottom: 'medium' }}>
          <FileInput
            key={fileInputResetKey}
            name="images"
            aria-label="Product images"
            aria-describedby={imageError ? 'product-image-error' : undefined}
            aria-invalid={Boolean(imageError)}
            accept={IMAGE_ACCEPT}
            multiple
            onChange={(event) => {
              const files = event.target.files
                ? Array.from(event.target.files)
                : [];

              setSelectedImages(files);
              setImageError(validateProductImages(files));

              setNewProduct({
                ...newProduct,
                images: files.map((file) => file.name).join(','),
              });
            }}
          />
          {imageError && <Text id="product-image-error" role="alert" color="status-critical">{imageError}</Text>}
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
                <label
                  htmlFor={`product-${key}`}
                  style={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: 'bold' }}
                >
                  {getFieldLabel(key)}{key === 'quantity' ? ' (optional)' : ''}:
                </label>

                <TextInput
                  id={`product-${key}`}
                  value={rawInputValues[key] ?? String(value)}
                  placeholder={String(value)}
                  size="small"
                  style={{ fontSize: '12px' }}
                  onChange={(event) =>
                    handleInputChange(
                      key as keyof Product,
                      event.target.value
                    )
                  }
                />
                {key === 'quantity' && quantityError && (
                  <Text size="small" color="status-critical" role="alert">
                    Enter a whole number between 0 and 2147483647, or leave quantity blank.
                  </Text>
                )}
              </Box>
            ))}

          {creationError && <Text role="alert" color="status-critical">{creationError}</Text>}
          <ActionButton label={creating ? "Creating..." : "Create Product"} onClick={handleCreateProductClick} disabled={creating} fixed />
        </Grid>
      </Card>

      {/* Validation warning */}
      {showValidationWarning && (
        <Layer
          onEsc={() => setShowValidationWarning(false)}
          onClickOutside={() => setShowValidationWarning(false)}
        >
          <Box pad="medium" gap="medium" width="medium" round="small">
            <Text weight="bold">
              Missing required information
            </Text>

            <Text>
              Please complete the following required fields before creating
              the product:
            </Text>

            <Box gap="small">
              {missingFields.map((field) => (
                <Text key={field}>
                  • {getFieldLabel(field)}
                </Text>
              ))}
            </Box>

            <ActionButton label="OK" onClick={() => setShowValidationWarning(false)} fixed />
          </Box>
        </Layer>
      )}

      {/* Success message */}
      {showSuccessModal && (
        <Layer
          onEsc={() => {
            setShowSuccessModal(false);
            setImageWarning('');
          }}
          onClickOutside={() => {
            setShowSuccessModal(false);
            setImageWarning('');
          }}
        >
          <Box pad="medium" gap="medium" width="medium">
            <Text weight="bold" role="status">Product added successfully.</Text>
            {imageWarning && <Text role="alert" color="status-critical">{imageWarning}</Text>}

            <ActionButton label="OK" onClick={() => {
                setShowSuccessModal(false);
                setImageWarning('');
              }} fixed />
          </Box>
        </Layer>
      )}
    </>
  );
};

export default CreateNewProduct;

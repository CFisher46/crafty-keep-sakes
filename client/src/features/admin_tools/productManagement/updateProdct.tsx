import { Box, Text, Select, TextInput, Grid, FileInput } from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { Product } from '../../../types';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { fetchAllProductsForAdmin, updateProduct, uploadProductImages } from '../../../store/products/productsThunks';
import { IMAGE_ACCEPT, validateProductImages } from './imageValidation';
import { deliveryTiers } from '../../../helpers/delivery';

type NumericProductField = 'price' | 'quantity' | 'sale_percent';
const numericFields: NumericProductField[] = ['price', 'quantity', 'sale_percent'];

const isNumericField = (key: string): key is NumericProductField =>
  numericFields.some((field) => field === key);

const UpdateProduct = () => {
  const dispatch = useAppDispatch();
  const [productList, setProductList] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [imageError, setImageError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [numericDrafts, setNumericDrafts] = useState<Partial<Record<NumericProductField, string>>>({});
  const [numericError, setNumericError] = useState<NumericProductField | null>(null);

  const booleanFields = new Set<keyof Product>(['on_sale', 'is_live']);

  const parseBooleanValue = (value: Product[keyof Product] | string): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;

    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await dispatch(fetchAllProductsForAdmin()).unwrap();
        setProductList(products);
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    loadProducts();
  }, [dispatch]);

  const handlerLoadProductDetails = (productId: string) => {
    const product = productList.find((p) => p.id === productId);
    if (product) {
      const normalizedProduct = { ...product, delivery_tier: product.delivery_tier ?? null };
      setSelectedProduct(normalizedProduct);
      setEditedProduct({ ...normalizedProduct });
      setSaveError('');
      setNumericDrafts({});
      setNumericError(null);
    } else {
      console.error('Product not found:', productId);
    }
  };

  const handleFieldChange = (key: keyof Product, value: string) => {
    if (isNumericField(key)) {
      setNumericDrafts((prev) => ({ ...prev, [key]: value }));
      if (numericError === key) setNumericError(null);
      if (!value.trim() || !Number.isFinite(Number(value))) return;
    }

    setEditedProduct((prev) => {
      if (!prev) return prev;

      let parsedValue: Product[keyof Product] = value;

      if (booleanFields.has(key)) {
        parsedValue = parseBooleanValue(value);
      } else if (isNumericField(key)) {
        parsedValue = Number(value);
      }

      return { ...prev, [key]: parsedValue };
    });
  };

  const handleSave = async () => {
    if (!editedProduct || !selectedProduct) return;
    setSaveError('');
    const invalidField = numericFields.find((field) => {
      const draft = numericDrafts[field];
      if (draft === undefined) return false;
      const parsed = Number(draft);
      return !draft.trim() || !Number.isFinite(parsed) ||
        (field === 'quantity' && !Number.isInteger(parsed));
    });
    if (invalidField) {
      setNumericError(invalidField);
      return;
    }
    const validationError = validateProductImages(selectedImages);
    setImageError(validationError);
    if (validationError) return;

    const changedFields: Record<string, unknown> = {};

    Object.entries(editedProduct).forEach(([key, value]) => {
      const typedKey = key as keyof Product;

      if (typedKey === 'images') {
        return;
      }

      if (value !== selectedProduct[typedKey]) {
        changedFields[String(typedKey)] = value;
      }
    });

    if (Object.keys(changedFields).length === 0 && selectedImages.length === 0) {
      return;
    }

    try {
      if (Object.keys(changedFields).length > 0) {
        await dispatch(
          updateProduct({
            id: selectedProduct.id,
            product: changedFields,
            previousProduct: selectedProduct,
          })
        ).unwrap();
      }

      if (selectedImages.length > 0) {
        await dispatch(
          uploadProductImages({
            productId: selectedProduct.id,
            files: selectedImages,
          })
        ).unwrap();
      }

      setProductList((current) => current.map((product) => product.id === editedProduct.id ? editedProduct : product));
      setSelectedProduct(null);
      setEditedProduct(null);
      setSelectedProductId('');
      setSelectedImages([]);
      setImageError('');
      setFileInputResetKey((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to update product:', err);
      setSaveError('Could not complete the update. Changes may have been saved; reload the product before trying again.');
    }
  };

  return (
    <Box pad="medium">

      {!selectedProduct ? (
        <Box pad="medium" direction="row" gap="small" align="center">
          <Select
            options={productList.map((p) => ({
              label: `${p.id} — ${p.product_name || 'Unnamed product'}${p.category ? ` (${p.category})` : ''}`,
              value: p.id,
            }))}
            labelKey="label"
            valueKey={{ key: 'value', reduce: true }}
            value={selectedProductId}
            onChange={({ value }) => setSelectedProductId(value)}
            placeholder="Select a product..."
          />
          <ActionButton label="Load Product Details" onClick={() => handlerLoadProductDetails(selectedProductId)} disabled={!selectedProductId} fixed />
        </Box>
      ) : (
        <Box gap="medium">
          <Box pad="small" border="top" margin={{ bottom: 'small' }}>
            <Text size="small" weight="bold" margin={{ bottom: 'xsmall' }}>
              Current product images
            </Text>
            {selectedProduct.images ? (
              <Box direction="row" wrap gap="small">
                {selectedProduct.images.split(',').filter(Boolean).map((image, index) => (
                  <Box key={`${image}-${index}`} border round="xsmall" pad="xsmall">
                    <Text size="small">{image.trim()}</Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text size="small">No images currently attached.</Text>
            )}
          </Box>

          <Box pad="small" margin={{ bottom: 'small' }}>
            <Text size="small" weight="bold" margin={{ bottom: 'xsmall' }}>
              Add new product images
            </Text>
            <FileInput
              key={fileInputResetKey}
              name="product-images"
              aria-label="Add new product images"
              aria-invalid={Boolean(imageError)}
              aria-describedby={imageError ? 'update-product-image-error' : undefined}
              accept={IMAGE_ACCEPT}
              multiple
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                setSelectedImages(files);
                setImageError(validateProductImages(files));
              }}
            />
            {imageError && <Text id="update-product-image-error" role="alert" color="status-critical">{imageError}</Text>}
          </Box>
          <Grid columns={['1/2', '1/2']} gap="small">
            {editedProduct &&
              Object.entries(editedProduct)
                .filter(([key]) => key !== 'images')
                .map(([key, value]) => (
                  <Box key={key} direction="column" gap="xsmall">
                    <label htmlFor={`update-product-${key}`} style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}:
                    </label>
                    {key === 'delivery_tier' ? (
                      <Select
                        id={`update-product-${key}`}
                        a11yTitle="Delivery tier"
                        value={String(value ?? '')}
                        options={deliveryTiers.map((tier) => ({ label: tier[0].toUpperCase() + tier.slice(1), value: tier }))}
                        labelKey="label"
                        valueKey={{ key: 'value', reduce: true }}
                        placeholder="Not classified"
                        size="small"
                        onChange={({ value: selectedValue }) => handleFieldChange('delivery_tier', String(selectedValue))}
                      />
                    ) : key === 'on_sale' || key === 'is_live' ? (
                      <Select
                        id={`update-product-${key}`}
                        options={[
                          { label: 'Yes', value: 'yes' },
                          { label: 'No', value: 'no' },
                        ]}
                        labelKey="label"
                        valueKey={{ key: 'value', reduce: true }}
                        value={parseBooleanValue(value) ? 'yes' : 'no'}
                        onChange={({ value: selectedValue }) =>
                          handleFieldChange(key as keyof Product, String(selectedValue))
                        }
                      />
                    ) : (
                      <TextInput
                        id={`update-product-${key}`}
                        value={isNumericField(key) ? numericDrafts[key] ?? String(value) : String(value)}
                        size="small"
                        style={{ fontSize: '12px' }}
                        readOnly={key === 'id'}
                        disabled={key === 'id'}
                        aria-invalid={numericError === key}
                        aria-describedby={numericError === key ? `update-product-${key}-error` : undefined}
                        onChange={(e) => handleFieldChange(key as keyof Product, e.target.value)}
                      />
                    )}
                    {numericError === key && (
                      <Text id={`update-product-${key}-error`} size="small" color="status-critical" role="alert">
                        {key === 'quantity' ? 'Enter a whole number.' : 'Enter a valid number.'}
                      </Text>
                    )}
                  </Box>
                ))}
          </Grid>
          {saveError && <Text role="alert" color="status-critical">{saveError}</Text>}
          <Box direction="row" gap="small" margin={{ top: 'medium' }}>
            <ActionButton label="Save Changes" onClick={handleSave} fixed />
            <ActionButton secondary label="Cancel" onClick={() => {
                setSelectedProduct(null);
                setEditedProduct(null);
                setSelectedProductId('');
                setSelectedImages([]);
                setImageError('');
                setFileInputResetKey((prev) => prev + 1);
              }} fixed />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default UpdateProduct;
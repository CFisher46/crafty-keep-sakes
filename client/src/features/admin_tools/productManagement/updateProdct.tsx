import { Box, Text, Select, Button, TextInput, Grid } from 'grommet';
import { Product } from '../../../types';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { fetchAllProductsForAdmin, updateProduct } from '../../../store/products/productsThunks';
import { buttonStyles } from '../../../helpers/formatting';

const UpdateProduct = () => {
  const dispatch = useAppDispatch();
  const [productList, setProductList] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);

  const booleanFields = new Set<keyof Product>(['on_sale', 'is_live']);
  const numericFields = new Set<keyof Product>(['price', 'quantity', 'sale_percent']);

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
      setSelectedProduct(product);
      setEditedProduct({ ...product });
    } else {
      console.error('Product not found:', productId);
    }
  };

  const handleFieldChange = (key: keyof Product, value: string) => {
    setEditedProduct((prev) => {
      if (!prev) return prev;

      let parsedValue: Product[keyof Product] = value;

      if (booleanFields.has(key)) {
        parsedValue = parseBooleanValue(value);
      } else if (numericFields.has(key)) {
        const numericValue = Number(value);
        parsedValue = Number.isFinite(numericValue) ? numericValue : 0;
      }

      return { ...prev, [key]: parsedValue };
    });
  };

  const handleSave = async () => {
    if (!editedProduct || !selectedProduct) return;
    try {
      await dispatch(
        updateProduct({
          id: selectedProduct.id,
          product: editedProduct,
          previousProduct: selectedProduct,
        })
      ).unwrap();
      setSelectedProduct(null);
      setEditedProduct(null);
      setSelectedProductId('');
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  return (
    <Box pad="medium">

      {!selectedProduct ? (
        <Box pad="medium" direction="row" gap="small" align="center">
          <Select
            options={productList.map((p) => ({ label: p.id, value: p.id }))}
            labelKey="label"
            valueKey={{ key: 'value', reduce: true }}
            value={selectedProductId}
            onChange={({ value }) => setSelectedProductId(value)}
            placeholder="Select a product..."
          />
          <Button
            primary
            label="Load Product Details"
            onClick={() => handlerLoadProductDetails(selectedProductId)}
            disabled={!selectedProductId}
            style={buttonStyles.default}
          />
        </Box>
      ) : (
        <Box gap="medium">
          <Grid columns={['1/2', '1/2']} gap="small">
            {editedProduct &&
              Object.entries(editedProduct)
                .filter(([key]) => key !== 'images')
                .map(([key, value]) => (
                  <Box key={key} direction="column" gap="xsmall">
                    <Text size="small" weight="bold" style={{ textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}:
                    </Text>
                    {key === 'on_sale' || key === 'is_live' ? (
                      <Select
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
                        value={String(value)}
                        size="small"
                        style={{ fontSize: '12px' }}
                        readOnly={key === 'id'}
                        disabled={key === 'id'}
                        onChange={(e) => handleFieldChange(key as keyof Product, e.target.value)}
                      />
                    )}
                  </Box>
                ))}
          </Grid>
          <Box direction="row" gap="small" margin={{ top: 'medium' }}>
            <Button label="Save Changes" onClick={handleSave} style={buttonStyles.default} />
            <Button
              label="Cancel"
              onClick={() => {
                setSelectedProduct(null);
                setEditedProduct(null);
                setSelectedProductId('');
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default UpdateProduct;
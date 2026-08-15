import { useEffect, useState } from 'react';
import { Form, Text, Box, Card, Grid, Button } from 'grommet';
import ShopFilterBar from '../../components/shop-filters-bar/shop-filter-bar';
// import { fetchFilteredProducts, fetchLiveProducts } from '../../helpers/api';
import { useLocation } from 'react-router-dom';
import { fetchAllProducts, fetchFilteredProducts } from '../../store/products/productsThunks';
import { addItemToBasket } from '../../store/basket/basketSlice';
import { addBasketItem } from '../../store/basket/basketThunks';
import { buttonStyles } from '../../helpers/formatting';
import CommonModal from '../../components/modals/common-modal';
import { Product } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectAllProducts,
  selectProductsLoading,
} from '../../store/products/productsSlice';

//TODO: change the products query to be dynamic based on the filters
// and categories selected by the user rather than geting all products
// including non-live.

function Shop() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const location = useLocation();

  const visibleProducts = products.filter(
    (product) => Boolean(product?.id) && Boolean(product?.product_name)
  );

  const parseProductImages = (images: Product['images']) => {
    if (Array.isArray(images)) return images;
    if (typeof images !== 'string' || !images.trim()) return [];

    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  };

  const handleAddToCart = async (product: Product) => {
    const productImages = parseProductImages(product.images);
    const basketItem = {
      id: product.id,
      image: productImages[0] || '',
      product_name: product.product_name,
      price: product.price,
      quantity: 1,
    };

    if (isLoggedIn) {
      await dispatch(addBasketItem(basketItem));
    }

    dispatch(addItemToBasket(basketItem));
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        await dispatch<any>(fetchAllProducts()).unwrap();

        const queryParams = new URLSearchParams(location.search);
        const filtersFromURL = Object.fromEntries(queryParams.entries());
        const hasUrlFilters = Object.keys(filtersFromURL).length > 0;

        if (!hasUrlFilters) {
          return;
        }

        const shopFilters = {
          ...filtersFromURL,
          is_live: 'true',
        };

        await dispatch<any>(fetchFilteredProducts(shopFilters)).unwrap();
      } catch (error) {
        console.error('Error fetching filtered products:', error);
      }
    };

    loadProducts();
  }, [location.search, dispatch]);

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <ShopFilterBar />
      <Box>
        <Form value={{}} onChange={() => {}}>
          {loading ? (
            <Text>Loading... </Text>
          ) : visibleProducts.length === 0 ? (
            <Box pad="medium" align="center" width="100%">
              <Text size="large">No products found.</Text>
              <Text size="small" color="dark-5">
                Try a different search or clear the filters.
              </Text>
            </Box>
          ) : (
            <Grid columns={{ count: 5, size: 'small' }} gap="small">
              {visibleProducts.map((product, i) => {
                const productImages = parseProductImages(product.images);

                return (
                  <Card
                    height="medium"
                    width="medium"
                    background="white"
                    key={product.id}
                    margin="small"
                    pad="small"
                    border={{ color: 'light-4', size: 'xsmall' }}
                    style={{
                      boxShadow:
                        hoveredCard === i
                          ? '0px 0px 20px rgb(45, 44, 45)'
                          : 'none',
                      transition: 'box-shadow 0.3s ease',
                    }}
                    onMouseEnter={() => setHoveredCard(i)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <Box height="small" width="100%" overflow="hidden">
                      {productImages && productImages.length > 0 ? (
                        <img
                          src={productImages[0]}
                          alt={product.product_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          height="100%"
                          width="100%"
                          background="white"
                          align="center"
                          justify="center"
                          round="small"
                        >
                          <Text>No Image</Text>
                        </Box>
                      )}
                    </Box>
                    <Box pad={{ vertical: 'small' }}>
                      <Text>{product.product_name}</Text>
                      <Text>£{product.price}</Text>
                    </Box>
                    <Box pad={{ vertical: 'small' }}>
                      <Button
                        label="Add to Basket"
                        //status="enabled"
                        //primary
                        style={buttonStyles.default}
                        onClick={() => handleAddToCart(product)}
                      />
                    </Box>
                    <Button
                      label="View Details"
                      //status="enabled"
                      onClick={() => openModal(product)}
                      style={buttonStyles.default}
                    />
                  </Card>
                );
              })}
            </Grid>
          )}
        </Form>

        {isModalOpen && selectedProduct && (
          <CommonModal
            title={selectedProduct?.product_name || 'Product Details'}
            type="viewProducts"
            values={selectedProduct}
            onClose={closeModal}
          />
        )}
      </Box>
    </>
  );
}

export default Shop;

import { useEffect, useMemo, useState } from 'react';
import { Form, Text, Box } from 'grommet';
import ShopFilterBar from '../../components/shop-filters-bar/shop-filter-bar';
import { useLocation } from 'react-router-dom';
import { fetchAllProducts, fetchFilteredProducts } from '../../store/products/productsThunks';
import { addItemToBasket } from '../../store/basket/basketSlice';
import { addBasketItem } from '../../store/basket/basketThunks';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';
import CommonModal from '../../components/modals/common-modal';
import { Product } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectAllProducts,
  selectProductsLoading,
} from '../../store/products/productsSlice';

function Shop() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const location = useLocation();
  const salePrice = (product: Product) => product.price * (1 - product.sale_percent / 100);

  const visibleProducts = products.filter(
    (product) => Boolean(product?.id) && Boolean(product?.product_name)
  );

  const primaryCategory = (product: Product) =>
    (product.category || '').split(',')[0].trim() || 'Other';

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    visibleProducts.forEach((product) => {
      const name = primaryCategory(product);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [visibleProducts]);

  const shownProducts =
    activeCategory === 'All'
      ? visibleProducts
      : visibleProducts.filter((product) => primaryCategory(product) === activeCategory);

  useEffect(() => {
    if (activeCategory !== 'All' && !categoryCounts.some(([name]) => name === activeCategory)) {
      setActiveCategory('All');
    }
  }, [categoryCounts, activeCategory]);

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
      price: product.on_sale ? salePrice(product) : product.price,
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
    <Box gap="small">
      <Box gap="xsmall" pad={{ vertical: 'small', horizontal: 'xsmall' }}>
        <Text
          size="xsmall"
          weight="bold"
          style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}
        >
          The collection
        </Text>
        <Text
          as="h1"
          margin="none"
          style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: '36px', color: ui.ink }}
        >
          Shop handcrafted keepsakes
        </Text>
      </Box>
      <ShopFilterBar />
      <Box>
        <Form value={{}} onChange={() => { }}>
          {loading ? (
            <Text style={{ color: ui.muted }}>Loading... </Text>
          ) : visibleProducts.length === 0 ? (
            <Box pad="large" align="center" width="100%" background={ui.sand} round="xsmall">
              <Text size="large" style={{ fontFamily: ui.serif }}>No products found.</Text>
              <Text size="small" style={{ color: ui.muted }}>
                Try a different search or clear the filters.
              </Text>
            </Box>
          ) : (
            <Box gap="medium">
              <Box
                direction="row"
                gap="medium"
                role="tablist"
                aria-label="Product categories"
                border={{ color: ui.line, side: 'bottom' }}
                style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
              >
                {[['All', visibleProducts.length] as [string, number], ...categoryCounts].map(
                  ([name, count]) => {
                    const isActive = activeCategory === name;
                    return (
                      <button
                        key={name}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveCategory(name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          borderBottom: `2px solid ${isActive ? ui.ink : 'transparent'}`,
                          marginBottom: '-1px',
                          padding: '10px 2px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: isActive ? ui.ink : ui.muted,
                          fontFamily: 'inherit',
                        }}
                      >
                        {name} <span style={{ fontWeight: 400 }}>({count})</span>
                      </button>
                    );
                  }
                )}
              </Box>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '28px 16px',
                }}
              >
                {shownProducts.map((product) => {
                  const productImages = parseProductImages(product.images);
                  const hovered = hoveredCard === product.id;

                  return (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHoveredCard(product.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div
                        style={{
                          position: 'relative',
                          aspectRatio: '4 / 5',
                          overflow: 'hidden',
                          background: ui.sand,
                          borderRadius: '2px',
                          cursor: 'pointer',
                        }}
                        onClick={() => openModal(product)}
                      >
                        {productImages && productImages.length > 0 ? (
                          <img
                            src={productImages[0]}
                            alt={product.product_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              transform: hovered ? 'scale(1.05)' : 'scale(1)',
                              transition: 'transform 0.4s ease',
                            }}
                          />
                        ) : (
                          <Box fill align="center" justify="center">
                            <Text size="small" style={{ color: ui.muted }}>No Image</Text>
                          </Box>
                        )}
                        {product.on_sale && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              background: ui.ink,
                              color: 'white',
                              fontSize: '11px',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                            }}
                          >
                            {product.sale_percent}% off
                          </div>
                        )}
                        <div
                          onClick={(event) => event.stopPropagation()}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            padding: '10px',
                            display: 'flex',
                            gap: '6px',
                            background: 'linear-gradient(to top, rgba(43,38,35,0.45), rgba(43,38,35,0))',
                            opacity: hovered ? 1 : 0,
                            transform: hovered ? 'none' : 'translateY(8px)',
                            transition: 'all 0.25s ease',
                          }}
                        >
                          <ActionButton
                            label="Add to Basket"
                            onClick={() => handleAddToCart(product)}
                          />
                          <ActionButton
                            label="View Details"
                            secondary
                            onClick={() => openModal(product)}
                          />
                        </div>
                      </div>
                      <Box pad={{ top: 'small' }} gap="xxsmall">
                        <Text style={{ fontFamily: ui.serif }}>{product.product_name}</Text>
                        {product.on_sale ? (
                          <Box direction="row" gap="small" align="baseline" wrap>
                            <Text size="small" style={{ textDecoration: 'line-through', color: ui.muted }}>
                              RRP:£{product.price}
                            </Text>
                            <Text size="small" weight="bold" color="status-critical">
                              £{salePrice(product).toFixed(2)}
                            </Text>
                          </Box>
                        ) : (
                          <Text size="small" style={{ color: ui.muted }}>RRP: £{product.price}</Text>
                        )}
                      </Box>
                    </div>
                  );
                })}
              </div>
            </Box>
          )}
        </Form>

        {isModalOpen && selectedProduct && (
          <CommonModal
            title={selectedProduct?.product_name || 'Product Details'}
            type="viewProducts"
            values={selectedProduct}
            onClose={closeModal}
            onAddToBasket={handleAddToCart}
          />
        )}
      </Box>
    </Box>
  );
}

export default Shop;

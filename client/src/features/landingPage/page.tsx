
import { Text, Box, Button, Grid, Card, CardBody, CardFooter } from 'grommet';
import CksButton from '../../components/buttons/cksButtons';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllProducts } from '../../store/products/productsThunks';
import { checkAuth, performLogout } from '../../store/auth/authThunks';
import { clearSelectedUser } from '../../store/users/usersSlice';
import { Product } from '../../types';
import Login from '../../components/login/login';
import {
  selectAllProducts,
  selectProductsLoading,
} from '../../store/products/productsSlice';
import { buttonStyles } from '../../helpers/formatting';
import CommonModal from '../../components/modals/common-modal';
import { addBasketItem } from '../../store/basket/basketThunks';
import { addItemToBasket } from '../../store/basket/basketSlice';

function Home() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const userDetails = useAppSelector((state) => state.auth.user);
  const userType = useAppSelector((state) => state.auth.user?.type);
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);

  const [showLogin, setShowLogin] = useState(false);
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [loopCards, setLoopCards] = useState(false);
  const scrollGeneration = useRef(0);

  const CAROUSEL_STEP = 200;

  const parseProductImages = (images: Product['images']) => {
    if (Array.isArray(images)) return images;
    if (typeof images !== 'string' || !images.trim()) return [];

    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  };

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const salePrice = (product: Product) =>
    product.price * (1 - product.sale_percent / 100);

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
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
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  useEffect(() => {
    const filteredProducts = products.filter(
      (product: Product) => product.on_sale
    );

    setOnSaleProducts(filteredProducts);
  }, [products]);

  /*
   * The sale list is rendered twice. This is the width of one copy,
   * used to wrap the scroll position without a visible jump.
   */
  const getLoopCycleWidth = () => {
    const el = carouselRef.current;
    const count = onSaleProducts.length;

    if (!el || count < 2 || el.children.length < count * 2) return 0;

    const first = el.children[0] as HTMLElement;
    const firstClone = el.children[count] as HTMLElement;

    return firstClone.offsetLeft - first.offsetLeft;
  };

  const setScrollLeftInstant = (el: HTMLDivElement, left: number) => {
    const behavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = left;
    el.style.scrollBehavior = behavior || 'smooth';
  };

  /*
   * After a move lands in the cloned copy, jump back by one cycle.
   * The clone matches the original, so the jump is not visible.
   */
  const normalizeLoopScroll = () => {
    const el = carouselRef.current;
    if (!el) return;

    const cycle = getLoopCycleWidth();
    if (cycle <= 0) return;

    if (el.scrollLeft >= cycle) {
      setScrollLeftInstant(el, el.scrollLeft % cycle);
    }
  };

  const updateCarouselButtons = () => {
    const el = carouselRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const cycle = getLoopCycleWidth();
    const singleSetOverflows =
      cycle > 0
        ? cycle > clientWidth + 1
        : scrollWidth > clientWidth + 1;
    const shouldLoop = onSaleProducts.length > 1 && singleSetOverflows;

    setLoopCards(shouldLoop);

    if (shouldLoop) {
      setCanScrollLeft(true);
      setCanScrollRight(true);
      return;
    }

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;

    const generation = ++scrollGeneration.current;
    const cycle = getLoopCycleWidth();
    const overflows = el.scrollWidth > el.clientWidth + 1;

    let timeoutId = 0;
    const finish = () => {
      window.clearTimeout(timeoutId);
      if (scrollGeneration.current !== generation) return;
      normalizeLoopScroll();
      updateCarouselButtons();
    };

    const startSmoothScroll = () => {
      if (scrollGeneration.current !== generation || !carouselRef.current) return;

      carouselRef.current.addEventListener('scrollend', finish, { once: true });
      carouselRef.current.scrollBy({
        left: direction * CAROUSEL_STEP,
        behavior: 'smooth',
      });
      timeoutId = window.setTimeout(finish, 700);
    };

    if (cycle > 0 && overflows && direction < 0 && el.scrollLeft < CAROUSEL_STEP) {
      setScrollLeftInstant(el, el.scrollLeft + cycle);
      requestAnimationFrame(startSmoothScroll);
      return;
    }

    startSmoothScroll();
  };

  const scrollCarouselRef = useRef(scrollCarousel);
  scrollCarouselRef.current = scrollCarousel;

  /*
   * Recalculate the button state whenever the products change.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => updateCarouselButtons());
    const onResize = () => updateCarouselButtons();

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [onSaleProducts]);

  /*
   * Automatically scroll the carousel every 5 seconds.
   * The list loops forward instead of jumping back to the start.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      scrollCarouselRef.current(1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    dispatch(performLogout());
    dispatch(clearSelectedUser());
  };

  if (loading) return <p>Loading products...</p>;

  return (
    <Box pad="medium">
      <Grid
        rows={['auto', 'auto']}
        columns={['flex', 'auto']}
        gap="small"
        areas={[
          { name: 'left', start: [0, 0], end: [0, 1] },
          { name: 'right', start: [1, 0], end: [1, 0] },
          { name: 'bottom', start: [0, 1], end: [1, 1] },
        ]}
      >
        <Box
          gridArea="left"
          background="#f7e5e1"
          pad="medium"
          round="small"
          border={{ color: 'light-4', size: 'xsmall' }}
        >
          <Text size="large" weight="bold">
            Welcome to Crafty Keepsakes!
          </Text>

          <Text>
            Explore our collection of handcrafted items and unique keepsakes.
          </Text>
        </Box>

        <Box
          gridArea="right"
          background="#e7f1f9"
          pad="medium"
          align="stretch"
          round="small"
          height={{ min: '250px' }}
          border={{ color: 'light-4', size: 'xsmall' }}
        >
          {isLoggedIn ? (
            <Box gap="small">
              <Text size="medium">
                Welcome, {userDetails ? userDetails.first_name : ''}!
              </Text>

              <Text>Your profile is ready to explore.</Text>

              {userType === 'admin' && (
                <Text size="small" color="status-critical">
                  Admin Access Granted
                </Text>
              )}

              <Box direction="row" gap="small" margin={{ top: 'small' }}>
                <CksButton
                  label="Log Out"
                  onClick={handleLogout}
                  status="enabled"
                />

                <CksButton
                  label="Go to Profile"
                  onClick={() => navigate(`/profile/${userDetails?.id}`)}
                  status="enabled"
                />
              </Box>
            </Box>
          ) : showLogin ? (
            <Box align="stretch" direction="row" gap="small">
              <Login />
            </Box>
          ) : (
            <Box>
              <Text size="medium" weight="bold">
                Login or Sign Up
              </Text>

              <Box direction="row" gap="small" margin={{ top: 'small' }}>
                <CksButton
                  onClick={() => setShowLogin(true)}
                  label="Login"
                  status="enabled"
                />

                <CksButton
                  onClick={() => navigate('/register')}
                  label="Sign Up"
                />
              </Box>
            </Box>
          )}
        </Box>

        <Box
          gridArea="bottom"
          background="#dcece9"
          pad="medium"
          round="small"
          border={{ color: 'light-4', size: 'xsmall' }}
        >
          <Text size="medium" weight="bold" margin={{ bottom: 'small' }}>
            Discover our latest offers!
          </Text>

          {onSaleProducts.length === 0 ? (
            <Text>No products currently on sale.</Text>
          ) : (
            <Box
              style={{
                position: 'relative',
                width: '100%',
                paddingLeft: '50px',
                paddingRight: '50px',
              }}
            >
              {/* Left carousel button */}
              <Button
                label="<<"
                disabled={!canScrollLeft}
                onClick={() => scrollCarousel(-1)}
                style={{
                  ...buttonStyles.default,
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                }}
              />

              {/* Carousel */}
              <Box
                direction="row"
                overflow="hidden"
                ref={carouselRef}
                onScroll={updateCarouselButtons}
                style={{
                  whiteSpace: 'nowrap',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'none',
                }}
              >
                {[...onSaleProducts, ...(loopCards ? onSaleProducts : [])].map(
                  (product, index) => {
                    const isClone = index >= onSaleProducts.length;

                    return (
                  <Card
                    key={isClone ? `${product.id}-loop` : product.id}
                    aria-hidden={isClone || undefined}
                    inert={isClone}
                    background="light-1"
                    pad="small"
                    border={{ color: 'light-4', size: 'xsmall' }}
                    margin={{ right: 'small' }}
                    style={{
                      display: 'inline-block',
                      width: '200px',
                      minWidth: '200px',
                      flexShrink: 0,
                    }}
                  >
                    <CardBody onClick={() => openModal(product)}>
                      <Box height="small" width="100%" overflow="hidden">
                        {parseProductImages(product.images).length > 0 ? (
                          <img
                            src={parseProductImages(product.images)[0]}
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

                      <Text weight="bold">
                        {product.product_name}
                      </Text>

                      <Text size="small">
                        {product.description}
                      </Text>

                      <Text
                        size="small"
                        style={{ textDecoration: 'line-through' }}
                      >
                        RRP:£{product.price}
                      </Text>

                      <Text size="small" color="status-critical">
                        £{salePrice(product).toFixed(2)} (
                        {product.sale_percent}% off)
                      </Text>
                    </CardBody>

                    <CardFooter pad={{ vertical: 'small' }} />

                    <Box margin={{ top: 'small' }}>
                      <Button
                        label="Add to Basket"
                        style={buttonStyles.default}
                        onClick={() => handleAddToCart(product)}
                      />
                    </Box>
                  </Card>
                    );
                  }
                )}
              </Box>

              {/* Right carousel button */}
              <Button
                label=">>"
                disabled={!canScrollRight}
                onClick={() => scrollCarousel(1)}
                style={{
                  ...buttonStyles.default,
                  position: 'absolute',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                }}
              />
            </Box>
          )}
        </Box>
      </Grid>

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
  );
}

export default Home;

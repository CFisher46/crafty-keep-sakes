import React, { useEffect, useState, useMemo } from 'react';
import { Text, Box, Button, Card } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllProducts } from '../../store/products/productsThunks';
import { checkAuth, performLogout } from '../../store/auth/authThunks';
import { clearSelectedUser } from '../../store/users/usersSlice';
import { Product } from '../../types';
import Login from '../../components/login/login';
import Register from '../../components/login/register';
import {
  selectAllProducts,
  selectProductsLoading,
} from '../../store/products/productsSlice';
import CommonModal from '../../components/modals/common-modal';
import { addBasketItem } from '../../store/basket/basketThunks';
import { addItemToBasket } from '../../store/basket/basketSlice';
import { buildApiUrl } from '../../api/apiPath';
import { ui } from '../../helpers/theme';
import PopularGallery from './components/PopularGallery';
import ActionButton from './components/ActionButton';
import ProductCarousel from './components/ProductCarousel';
import BlogSummarySection, { HomepageBlogItem } from './components/BlogSummarySection';

function Home() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const userDetails = useAppSelector((state) => state.auth.user);
  const userType = useAppSelector((state) => state.auth.user?.type);
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);

  const [authView, setAuthView] = useState<'none' | 'login' | 'register'>('none');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blogs, setBlogs] = useState<HomepageBlogItem[]>([]);

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
    let image = '';
    if (Array.isArray(product.images)) {
      image = product.images[0] || '';
    } else if (typeof product.images === 'string' && product.images.trim()) {
      try {
        const parsed = JSON.parse(product.images);
        image = Array.isArray(parsed) ? parsed[0] || '' : '';
      } catch {
        image = '';
      }
    }

    const basketItem = {
      id: product.id,
      image,
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

  // Fetch blogs for homepage section
  useEffect(() => {
    let isMounted = true;
    fetch(buildApiUrl('blog', '/posts'), { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        if (isMounted && Array.isArray(data?.data)) {
          setBlogs(data.data);
        }
      })
      .catch(() => {
        if (isMounted) setBlogs([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    dispatch(performLogout());
    dispatch(clearSelectedUser());
  };

  // Products Panels: On Sale & New Products
  const onSaleProducts = useMemo(
    () => products.filter((p: Product) => p.on_sale),
    [products]
  );

  const popularProducts = useMemo(
    () =>
      products
        .filter((p: Product) => Number(p.units_sold) > 0)
        .sort((a: Product, b: Product) => Number(b.units_sold) - Number(a.units_sold))
        .slice(0, 5),
    [products]
  );

  // Blog items: newest and top 5 popular
  const newestBlog = useMemo(() => (blogs.length > 0 ? blogs[0] : null), [blogs]);

  const popularBlogs = useMemo(() => {
    return [...blogs]
      .sort((a, b) => {
        const scoreA =
          (a.reaction_counts?.likes || 0) + (a.comments?.length || 0);
        const scoreB =
          (b.reaction_counts?.likes || 0) + (b.comments?.length || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [blogs]);

  if (loading) {
    return (
      <Box pad="large" align="center" justify="center">
        <Text size="medium" color="dark-4">
          Loading handcrafted keepsakes...
        </Text>
      </Box>
    );
  }

  return (
    <Box pad={{ horizontal: 'medium', vertical: 'xsmall' }} gap="small">
      {/* Hero & Account / Profile row */}
      <Box direction="row-responsive" gap="small" align="stretch">
        <Box
          flex={{ grow: 2, shrink: 1 }}
          basis="2/3"
          background={ui.sand}
          pad={{ horizontal: 'large', vertical: 'xlarge' }}
          round="xsmall"
          justify="center"
          style={{ minHeight: '300px' }}
        >
          <Box gap="small" style={{ maxWidth: '560px' }}>
            <Text
              size="xsmall"
              weight="bold"
              style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}
            >
              Handmade Wedding Keepsakes
            </Text>
            <Text
              as="h1"
              margin="none"
              style={{
                fontFamily: ui.serif,
                fontWeight: 400,
                fontSize: '44px',
                lineHeight: 1.15,
                color: ui.ink,
              }}
            >
              Crafted with love for your special day
            </Text>
            <Text size="medium" style={{ color: ui.muted }}>
              Bespoke, artisan keepsakes made to be cherished for a lifetime.
            </Text>
            <Box direction="row" gap="small" margin={{ top: 'small' }} style={{ maxWidth: '420px' }}>
              <ActionButton label="Shop Collection" onClick={() => navigate('/Shop')} />
              <ActionButton label="Read Journal" secondary onClick={() => navigate('/Blog')} />
            </Box>
          </Box>
        </Box>

        <Box
          flex={{ grow: 1, shrink: 1 }}
          basis="1/3"
          background="white"
          pad="large"
          round="xsmall"
          border={{ color: ui.line, size: 'xsmall' }}
          justify="center"
          style={{ minWidth: '280px' }}
        >
          {isLoggedIn ? (
            <Box gap="small">
              <Text size="xsmall" weight="bold" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}>
                {userType === 'admin' ? 'Admin account' : 'Your account'}
              </Text>
              <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: '26px', color: ui.ink }}>
                Welcome back, {userDetails ? userDetails.first_name : 'Friend'}
              </Text>
              <Text size="small" style={{ color: ui.muted }}>
                Manage your orders, saved items and addresses.
              </Text>
              <Box direction="row" gap="small" margin={{ top: 'small' }}>
                <ActionButton label="My Profile" onClick={() => navigate('/profile/' + (userDetails?.id ?? ''))} />
                <ActionButton label="Log Out" secondary onClick={handleLogout} />
              </Box>
            </Box>
          ) : authView !== 'none' ? (
            <Box align="stretch" gap="small">
              {authView === 'login' ? <Login /> : <Register onRegistered={() => setAuthView('login')} />}
              <Box direction="row" justify="center" gap="small" margin={{ top: 'xsmall' }}>
                <Button
                  plain
                  label={authView === 'login' ? 'Create an account' : 'I already have an account'}
                  size="xsmall"
                  onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}
                  style={{ color: ui.muted, textDecoration: 'underline' }}
                />
                <Button plain label="Back" size="xsmall" onClick={() => setAuthView('none')} style={{ color: ui.muted, textDecoration: 'underline' }} />
              </Box>
            </Box>
          ) : (
            <Box gap="small">
              <Text size="xsmall" weight="bold" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: ui.accent }}>
                Member area
              </Text>
              <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontWeight: 400, fontSize: '26px', color: ui.ink }}>
                Sign in to your account
              </Text>
              <Text size="small" style={{ color: ui.muted }}>
                View orders, track packages and review products.
              </Text>
              <Box direction="row" gap="small" margin={{ top: 'small' }}>
                <ActionButton label="Sign In" onClick={() => setAuthView('login')} />
                <ActionButton label="Register" secondary onClick={() => setAuthView('register')} />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Popular gallery + Journal side by side */}
      <Box direction="row-responsive" gap="small" align="stretch">
        <Card
          flex={{ grow: 1, shrink: 1 }}
          basis="1/2"
          background="white"
          pad="medium"
          round="xsmall"
          border={{ color: ui.line, size: 'xsmall' }}
          elevation="none"
        >
          <PopularGallery products={popularProducts} onOpenModal={openModal} />
        </Card>
        <Card
          flex={{ grow: 1, shrink: 1 }}
          basis="1/2"
          background="white"
          pad="medium"
          round="xsmall"
          border={{ color: ui.line, size: 'xsmall' }}
          elevation="none"
        >
          <BlogSummarySection
            newestBlog={newestBlog}
            popularBlogs={popularBlogs}
            isLoggedIn={isLoggedIn}
          />
        </Card>
      </Box>

      {/* Panel 2: On Sale Offers */}
      <Card
        background="white"
        pad="medium"
        round="xsmall"
        border={{ color: ui.line, size: 'xsmall' }}
        elevation="none"
      >
        <ProductCarousel
          products={onSaleProducts}
          title="Special Wedding Offers"
          subtitle="Exclusive discounts on handcrafted keepsakes"
          emptyText="No products currently on sale."
          onOpenModal={openModal}
          onAddToCart={handleAddToCart}
        />
      </Card>

      {/* Product Details Modal */}
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

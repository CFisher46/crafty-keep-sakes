import React, { useEffect, useState, useMemo } from 'react';
import { Text, Box, Button, Card } from 'grommet';
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
import CommonModal from '../../components/modals/common-modal';
import { addBasketItem } from '../../store/basket/basketThunks';
import { addItemToBasket } from '../../store/basket/basketSlice';
import { buildApiUrl } from '../../api/apiPath';
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

  const [showLogin, setShowLogin] = useState(false);
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
    <Box pad={{ horizontal: 'medium', vertical: 'small' }} gap="large">
      {/* Hero & Account / Profile row */}
      <Box direction="row-responsive" gap="medium" align="stretch">
        {/* Hero banner */}
        <Box
          flex={{ grow: 2, shrink: 1 }}
          background="#FFFCC9"
          pad="large"
          round="small"
          border={{ color: '#f0e6ec', size: 'xsmall' }}
          justify="center"
          style={{
            boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.03)',
            minHeight: '220px',
          }}
        >
          <Box gap="small">
            <Box
              background="#F4C2C2"
              pad={{ horizontal: 'small', vertical: 'xsmall' }}
              round="small"
              alignSelf="start"
            >
              <Text size="xsmall" weight="bold" color="dark-1">
                Handmade Wedding Keepsakes
              </Text>
            </Box>
            <Text size="xxlarge" weight="bold">
              Crafted With Love for Your Special Day
            </Text>
            <Text size="medium" color="dark-3">
              Explore bespoke, artisanal keepsakes made to cherish memories for a lifetime.
            </Text>
            <Box direction="row" gap="small" margin={{ top: 'small' }}>
              <ActionButton label="Explore Collection" onClick={() => navigate('/Shop')} />
              <ActionButton label="Read Journal" secondary onClick={() => navigate('/Blog')} />
            </Box>
          </Box>
        </Box>

        {/* User Account / Login Widget */}
        <Box
          flex={{ grow: 1, shrink: 1 }}
          background="#eef7fd"
          pad="medium"
          round="small"
          border={{ color: '#f0e6ec', size: 'xsmall' }}
          justify="center"
          style={{
            boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.03)',
            minWidth: '280px',
          }}
        >
          {isLoggedIn ? (
            <Box gap="small">
              <Text size="large" weight="bold">
                Welcome back, {userDetails ? userDetails.first_name : 'Friend'}!
              </Text>
              <Text size="small" color="dark-3">
                Manage your orders, saved wedding items, and addresses.
              </Text>

              {userType === 'admin' && (
                <Box
                  background="#F4C2C2"
                  pad={{ horizontal: 'small', vertical: 'xsmall' }}
                  round="xsmall"
                  alignSelf="start"
                >
                  <Text size="xsmall" weight="bold" color="status-critical">
                    Admin Access
                  </Text>
                </Box>
              )}

              <Box direction="row" gap="small" margin={{ top: 'small' }}>
                <ActionButton label="My Profile" onClick={() => navigate('/profile/' + (userDetails?.id ?? ''))} />
                <ActionButton label="Log Out" secondary onClick={handleLogout} />
              </Box>
            </Box>
          ) : showLogin ? (
            <Box align="stretch">
              <Login />
              <Box margin={{ top: 'xsmall' }} align="center">
                <Button
                  plain
                  label="Back"
                  size="xsmall"
                  onClick={() => setShowLogin(false)}
                />
              </Box>
            </Box>
          ) : (
            <Box gap="small">
              <Text size="large" weight="bold">
                Member Area
              </Text>
              <Text size="small" color="dark-3">
                Sign in to view orders, track packages, or review products.
              </Text>
              <Box direction="row" gap="small" margin={{ top: 'xsmall' }}>
                <ActionButton label="Sign In" onClick={() => setShowLogin(true)} />
                <ActionButton label="Register" secondary onClick={() => navigate('/Login')} />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Popular gallery + Journal side by side */}
      <Box direction="row-responsive" gap="medium" align="stretch">
        <Card
          flex={{ grow: 1, shrink: 1 }}
          basis="1/2"
          background="white"
          pad="medium"
          round="small"
          border={{ color: '#f0e6ec', size: 'xsmall' }}
          style={{ boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' }}
        >
          <PopularGallery products={popularProducts} onOpenModal={openModal} />
        </Card>
        <Card
          flex={{ grow: 1, shrink: 1 }}
          basis="1/2"
          background="white"
          pad="medium"
          round="small"
          border={{ color: '#f0e6ec', size: 'xsmall' }}
          style={{ boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' }}
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
        round="small"
        border={{ color: '#f0e6ec', size: 'xsmall' }}
        style={{ boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)' }}
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

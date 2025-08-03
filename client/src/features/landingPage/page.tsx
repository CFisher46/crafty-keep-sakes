import { Text, Box, Grid, Card, CardBody, CardFooter } from "grommet";
import CksButton from "../../components/buttons/cksButtons";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/auth/authSlice";

//import { buttonStyles } from '../../helpers/styles';

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectAllProducts,
  selectProductsError,
  selectProductsLoading
} from "../../store/products/productsSlice";
import { Product } from "../../store/products/types";
import { fetchAllProducts } from "../../store/products/productsThunks";
import Login from "../../components/login/login";
import { RootState } from "../../store";

function Home() {
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  console.log("Is Logged In:", isLoggedIn);

  const userDetails = useAppSelector((state: RootState) => state.auth.user);
  const user = useAppSelector((state: RootState) => state.users.selectedUser);
  const [showLogin, setShowLogin] = useState(false);
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  //const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  const handleLogout = () => dispatch(logout());

  useEffect(() => {
    const filteredProducts = products.filter(
      (product: Product) => product.on_sale
    );
    console.log("Total Filtered Products:", filteredProducts.length);
    setOnSaleProducts(filteredProducts);
  }, [products]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth) {
          carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          carouselRef.current.scrollBy({ left: 200, behavior: "smooth" });
        }
      }
    }, 5000); // Slowed down the interval to 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Box pad="medium">
      <Grid
        rows={["auto", "auto"]}
        columns={["flex", "auto"]}
        gap="small"
        areas={[
          { name: "left", start: [0, 0], end: [0, 1] },
          { name: "right", start: [1, 0], end: [1, 0] },
          { name: "bottom", start: [0, 1], end: [1, 1] }
        ]}
      >
        <Box
          gridArea="left"
          background="#f7e5e1"
          pad="medium"
          round="small"
          border={{ color: "light-4", size: "xsmall" }}
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
          height={{ min: "250px" }}
          border={{ color: "light-4", size: "xsmall" }}
        >
          {isLoggedIn ? (
            <Box gap={"small"}>
              <Text size="medium">
                Welcome, {userDetails ? userDetails.first_name : ""}!
              </Text>
              <Text>Your profile is ready to explore.</Text>
              <Box direction="row" gap="small" margin={{ top: "small" }}>
                <CksButton
                  label="Log Out"
                  onClick={handleLogout}
                  status="enabled"
                />
                <CksButton
                  label="Go to Profile"
                  onClick={() => navigate("/profile")}
                  //style={buttonStyles.default}
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
              <Box direction="row" gap="small" margin={{ top: "small" }}>
                <CksButton
                  onClick={() => setShowLogin(true)}
                  label="Login"
                  status="enabled"
                  //style={buttonStyles.default}
                />
                <CksButton
                  onClick={() => navigate("/register")}
                  label="Sign Up"
                  //style={buttonStyles.default}
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
          border={{ color: "light-4", size: "xsmall" }}
        >
          <Text size="medium" weight="bold" margin={{ bottom: "small" }}>
            Discover our latest products and offers!
          </Text>
          <Box
            direction="row"
            overflow="hidden" // Hides the scrollbar
            style={{
              whiteSpace: "nowrap",
              scrollBehavior: "smooth",
              scrollbarWidth: "none" // Hides scrollbar for Firefox
            }}
            ref={carouselRef}
          >
            {onSaleProducts.map((product) => (
              <Card
                key={product.id}
                background="light-1"
                pad="small"
                border={{ color: "light-4", size: "xsmall" }}
                margin={{ right: "small" }}
                style={{
                  display: "inline-block",
                  minWidth: "200px"
                }}
              >
                <CardBody>
                  <Text weight="bold">{product.product_name}</Text>
                  <Text size="small">{product.description}</Text>
                  <Text size="small" color="status-critical">
                    £{product.price}
                  </Text>
                </CardBody>
                <CardFooter pad={{ vertical: "small" }}></CardFooter>
              </Card>
            ))}
          </Box>
        </Box>
      </Grid>
    </Box>
  );
}

export default Home;

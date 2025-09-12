import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Form, Text, Box, Card, Grid, Button } from "grommet";
// import { fetchFilteredProducts, fetchLiveProducts } from '../../helpers/api';
import { useLocation } from "react-router-dom";
import { fetchFilteredProducts } from "../../store/products/productsThunks";
import { addItemToBasket } from "../../store/basket/basketSlice";
import {buttonStyles} from "../../helpers/formatting";
import CommonModal from "../../components/modals/common-modal";
import { Product } from "../../types";


//TODO: change the products query to be dynamic based on the filters
// and categories selected by the user rather than geting all products
// including non-live.


function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const dispatch = useDispatch();
  const location = useLocation();

  const handleAddToCart = (product: Product) => {
    dispatch(
      addItemToBasket({
        id: product.id,
        image: product.images?.[0] || "", // Ensure a valid image or placeholder is passed
        product_name: product.product_name,
        price: product.price,
        quantity: 1
      })
    );
  };

  const loadProducts = async () => {
    try {
      const queryParams = new URLSearchParams(location.search);
      const filtersFromURL = Object.fromEntries(queryParams.entries());

      // Dispatch the thunk and unwrap the result to get the data
      const data = await dispatch<any>(
        fetchFilteredProducts(filtersFromURL)
      ).unwrap();

      setProducts(
        JSON.parse(data).map((p: Product) => ({
          ...p,
          name: p.product_name,
          images: typeof p.images === "string" ? JSON.parse(p.images) : p.images
        }))
      );
    } catch (error) {
      console.error("Error fetching filtered products:", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [location.search]);

    const openModal = (product: Product) => {
      setSelectedProduct(product);
      setIsModalOpen(true);
    };

    const closeModal = () => {
      setSelectedProduct(null);
      setIsModalOpen(false);
    };

  return (
    <Box>
      <Form value={{}} onChange={() => {}}>
        <Grid columns={{ count: 5, size: "small" }} gap="small">
          {products.length === 0 ? (
            <Text>Loading... </Text>
          ) : (
            products.map((product, i) => (
              <Card
                height="medium"
                width="medium"
                background="white"
                key={i}
                margin="small"
                pad="small"
                border={{ color: "light-4", size: "xsmall" }}
                style={{
                  boxShadow:
                    hoveredCard === i ? "0px 0px 20px rgb(45, 44, 45)" : "none",
                  transition: "box-shadow 0.3s ease"
                }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <Box height="small" width="100%" overflow="hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.product_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
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
                <Box pad={{ vertical: "small" }}>
                  <Text>{product.product_name}</Text>
                  <Text>£{product.price}</Text>
                </Box>
                <Box pad={{ vertical: "small" }}>
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
            ))
          )}
        </Grid>
      </Form>

      {isModalOpen && selectedProduct && (
        <CommonModal
          title="Product Details"
          type="viewProducts"
          values={selectedProduct}
          onClose={closeModal}
        />
      )
      }
    </Box>
  );
}

export default Shop;

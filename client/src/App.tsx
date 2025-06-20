import GetAllProducts from "./test_integrations/features/products/all-products";
import GetProductById from "./test_integrations/features/products/product-by-id";
import GetAllUsers from "./test_integrations/features/users/get-all-users";
import GetUserById from "./test_integrations/features/users/user-by-id";

function App() {
  return (
    <>
      <GetAllProducts />;
      <GetProductById />;
      <GetAllUsers />;
      <GetUserById />;
    </>
  );
}

export default App;

import AddProductPage from "./test_integrations/features/products/addProductPage";
import GetAllProducts from "./test_integrations/features/products/all-products";
import GetAllUsers from "./test_integrations/features/users/get-all-users";
import GetUserById from "./test_integrations/features/users/user-by-id";

function App() {
  return (
    <>
      <GetAllUsers />;
      <GetUserById />;
    </>
  );
}

export default App;

import { useLocation } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../../features/landingPage/page";
import Shop from "../../features/products/page";
import ShoppingBasket from "../../features/basket/page";
// import About from '../../pages/about/aboutUs';
// import Shop from '../../pages/shop/shop';
// import Blog from '../../pages/blog/blog';
import Profile from "../../features/profile/page";
import Admin from "../../features/admin_tools/page";
import Login from "../../components/login/login";
import ProtectedRoute from "../../helpers/protectedRoutes";
// import ContactUs from '../../pages/contactUs/contactUs';
import { Box } from "grommet";
// import UserRegistration from '../../pages/registration/registration';

function MainBody() {
  const location = useLocation();
  return (
    <Box pad="xsmall">
      <Box pad="small" round="small" fill>
        <Routes key={location.pathname}>
          <Route path="/" element={<Navigate to="/Home" />} />
          <Route path="/Home" element={<LandingPage />} />
          {/* <Route path="/About" element={<About />} />
          <Route path="/Blog" element={<Blog />} /> */}
          <Route path="/Shop" element={<Shop />} />
          <Route path="/Basket" element={<ShoppingBasket />} />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute
                element={<Profile />}
                requiredTypes={["customer", "admin", "Customer"]}
              />
            }
          />{" "}
          <Route
            path="/Admin"
            element={
              <ProtectedRoute
                element={<Admin />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          {/* <Route path="/Contact" element={<ContactUs />} /> */}
          <Route path="/Login" element={<Login />} />
          {/* <Route path="/Register" element={<UserRegistration />} /> */}
        </Routes>
      </Box>
    </Box>
  );
}

export default MainBody;

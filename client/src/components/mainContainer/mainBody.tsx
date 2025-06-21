import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../../features/landingPage/page";
// import About from '../../pages/about/aboutUs';
// import Shop from '../../pages/shop/shop';
// import Blog from '../../pages/blog/blog';
// import Profile from '../../pages/profile/usersProfile';
// import Admin from '../../pages/adminFeatures/adminFeatures';
// import Login from '../../pages/login/login';
// import ProtectedRoute from '../../helpers/protectedRoute';
// import ContactUs from '../../pages/contactUs/contactUs';
import { Box } from "grommet";
// import UserRegistration from '../../pages/registration/registration';
// import Basket from '../../pages/basket/basket';

function MainBody() {
  return (
    <Box pad="xsmall">
      <Box pad="small" round="small" fill>
        <Routes>
          <Route path="/" element={<Navigate to="/Home" />} />
          <Route path="/Home" element={<LandingPage />} />
          {/* <Route path="/About" element={<About />} />
          <Route path="/Blog" element={<Blog />} />
          <Route path="/Shop" element={<Shop />} />
          <Route path="/Basket" element={<Basket />} />
          <Route
            path="/Profile"
            element={
              <ProtectedRoute
                element={<Profile />}
                requiredTypes={["customer", "admin", "Customer"]}
                path={""}
              />
            }
          />{" "}
          <Route
            path="/Admin"
            element={
              <ProtectedRoute
                element={<Admin />}
                requiredTypes={["Admin", "admin"]}
                path={""}
              />
            }
          />{" "}
          <Route path="/Contact" element={<ContactUs />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Register" element={<UserRegistration />} /> */}
        </Routes>
      </Box>
    </Box>
  );
}

export default MainBody;

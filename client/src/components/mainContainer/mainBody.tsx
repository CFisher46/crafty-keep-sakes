import { useLocation } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../../features/landingPage/page";
import Shop from "../../features/products/page";
import ShoppingBasket from "../../features/basket/page";
// import About from '../../pages/about/aboutUs';
import Blog from '../../features/blog/page';
import Profile from "../../features/profile/page";
import Admin from "../../features/admin_tools/page";
import Login from "../../components/login/login";
import Register from "../../components/login/register";
import NotificationsPage from "../../features/notifications/page";
import ProtectedRoute from "../../helpers/protectedRoutes";
import MockPaymentPage from "../../features/payments/mockPaymentPage";
import PaymentResultPage from "../../features/payments/resultPage";
// import ContactUs from '../../pages/contactUs/contactUs';
import { Box } from "grommet";
import ReviewsPage from "../../features/reviews/page";
import MyInvoicesPage from "../../features/invoices/page";
import ReportingPage from "../../features/reporting/page";
import AllInvoicesPage from "../../features/reporting/invoices/page";
import DashboardPage from "../../features/reporting/dashboard/page";
import ProductsReportPage from "../../features/reporting/reports/productsReport";
import UsersReportPage from "../../features/reporting/reports/usersReport";
import BlogReportPage from "../../features/reporting/reports/blogReport";
// import UserRegistration from '../../pages/registration/registration';

function MainBody() {
  const location = useLocation();
  return (
    <Box pad="xsmall">
      <Box pad="xsmall" round="small" fill>
        <Routes key={location.pathname}>
          <Route path="/" element={<Navigate to="/Home" />} />
          <Route path="/Home" element={<LandingPage />} />
          {/* <Route path="/About" element={<About />} /> */}
          <Route path="/Blog" element={<Blog />} />
          <Route path="/Blog/:id" element={<Blog />} />
          <Route path="/Shop" element={<Shop />} />
          <Route path="/Basket" element={<ShoppingBasket />} />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                element={<NotificationsPage />}
                requiredTypes={["customer", "admin", "Customer", "Admin"]}
              />
            }
          />
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
            path="/payments/mock"
            element={
              <ProtectedRoute
                element={<MockPaymentPage />}
                requiredTypes={["customer", "admin", "Customer", "Admin"]}
              />
            }
          />
          <Route
            path="/payments/result"
            element={
              <ProtectedRoute
                element={<PaymentResultPage />}
                requiredTypes={["customer", "admin", "Customer", "Admin"]}
              />
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute
                element={<MyInvoicesPage />}
                requiredTypes={["customer", "admin", "Customer", "Admin"]}
              />
            }
          />
          <Route
            path="/Reporting"
            element={
              <ProtectedRoute
                element={<ReportingPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          <Route
            path="/Reporting/dashboard"
            element={
              <ProtectedRoute
                element={<DashboardPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          <Route
            path="/Reporting/products"
            element={
              <ProtectedRoute
                element={<ProductsReportPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          <Route
            path="/Reporting/users"
            element={
              <ProtectedRoute
                element={<UsersReportPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          <Route
            path="/Reporting/blog"
            element={
              <ProtectedRoute
                element={<BlogReportPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
          <Route
            path="/Reporting/invoices"
            element={
              <ProtectedRoute
                element={<AllInvoicesPage />}
                requiredTypes={["Admin", "admin"]}
              />
            }
          />
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
          <Route path="/Register" element={<Register />} />
          <Route path="/Reviews" element={<ReviewsPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default MainBody;

// client/src/routes/ProtectedRoute.tsx
import React, { JSX } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../helpers/userAuth";

interface ProtectedRouteProps {
  element: JSX.Element;
  requiredTypes: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  requiredTypes
}) => {
  const { isAuthenticated, user, userType } = useAuth();

  if (user) return element;

  if (!isAuthenticated || !userType || !requiredTypes.includes(userType)) {
    return <Navigate to="/home" replace />;
  }

  return element;
};

export default ProtectedRoute;

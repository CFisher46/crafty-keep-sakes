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
  const { isAuthenticated, user, userType, loading } = useAuth();

  if (user) return element;

  // After a full page load the session is still being restored, so don't redirect yet
  if (loading) return null;

  if (!isAuthenticated || !userType || !requiredTypes.includes(userType)) {
    return <Navigate to="/home" replace />;
  }

  return element;
};

export default ProtectedRoute;

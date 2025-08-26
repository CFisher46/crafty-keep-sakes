// client/src/hooks/useAuth.ts
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { RootState } from "../store";
import { loginSuccess, logout } from "../store/auth/authSlice";
import { User } from "../store/users/types";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const user = useAppSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error("Session invalid");
        }

        const data = await response.json();
        const userData: User = data.user;

        dispatch(loginSuccess(userData));
      } catch (error) {
        dispatch(logout());
      }
    };

    fetchSession();
  }, [dispatch]);

  return {
    isAuthenticated: isLoggedIn,
    user,
    userType: user?.type || null
  };
};

export default useAuth;

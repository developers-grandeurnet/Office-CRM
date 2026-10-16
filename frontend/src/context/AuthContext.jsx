import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "../services/api";
import { clearAuthTokens, getAccessToken, setAuthTokens } from "../services/authToken";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      Cookies.remove("token");
      const accessToken = getAccessToken();
      if (!accessToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("auth/me");
        setUser(response.data.data);
        setToken(accessToken);
        Cookies.set("user", JSON.stringify(response.data.data), { expires: 1 });
      } catch (e) {
        console.error("Failed to fetch user profile", e);
        clearAuthTokens();
        setUser(null);
        setToken(null);
        Cookies.remove("user");
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData, tokens = {}) => {
    if (tokens.accessToken) {
      setAuthTokens(tokens.accessToken, tokens.refreshToken || "");
      setToken(tokens.accessToken);
    } else {
      setToken(getAccessToken() || "session");
    }
    setUser(userData);
    Cookies.remove("token");
    Cookies.set("user", JSON.stringify(userData), { expires: 1 });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearAuthTokens();
    Cookies.remove("token");
    Cookies.remove("user");
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.userType);
  };

  const hasPermission = (permissions) => {
    if (!user) return false;
    if (user.userType === "ADMIN") return true;
    if (!permissions || permissions.length === 0) return true;
    const permList = Array.isArray(permissions) ? permissions : [permissions];
    const granted = user.userType === "CLIENT" && !(user.permissions || []).length
      ? ["CLIENT_VIEW_PROJECTS", "CLIENT_SUPPORT"]
      : (user.permissions || []);
    return permList.some((p) => granted.includes(p));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

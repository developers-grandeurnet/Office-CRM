import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from cookies on mount
  useEffect(() => {
    const initializeAuth = async () => {
      Cookies.remove("token");
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}auth/me`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
          setToken("session");
          Cookies.set("user", JSON.stringify(data.data), { expires: 1 });
        } else {
          setUser(null);
          setToken(null);
          Cookies.remove("user");
        }
      } catch (e) {
        console.error("Failed to fetch user profile", e);
        const savedUser = Cookies.get("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setToken("session");
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setToken("session");
    Cookies.remove("token");
    Cookies.set("user", JSON.stringify(userData), { expires: 1 });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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
    // Existing clients without saved perms keep full portal access
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

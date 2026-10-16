import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // required to send/receive cookies if applicable
});

api.interceptors.request.use(
  (config) => config,
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = String(error.config?.url || "");
      const signingIn = url.includes("auth/login") || url.includes("auth/me") || url.includes("auth/refresh");
      Cookies.remove("token");
      Cookies.remove("user");
      Cookies.remove("accessToken");
      if (!signingIn && window.location.pathname !== "/") window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;

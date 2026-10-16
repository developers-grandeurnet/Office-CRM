import axios from "axios";
import Cookies from "js-cookie";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let refreshPromise = null;

const clearClientSession = () => {
  clearAuthTokens();
  Cookies.remove("token");
  Cookies.remove("user");
  Cookies.remove("accessToken");
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = String(original.url || "");
    const authCall = url.includes("auth/login") || url.includes("auth/me") || url.includes("auth/refresh");

    if (status === 401 && code === "TOKEN_EXPIRED" && !original._retry && !authCall) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${import.meta.env.VITE_API_URL}auth/refresh-token`,
            { refreshToken: getRefreshToken() },
            { withCredentials: true }
          ).then((res) => {
            const accessToken = res.data?.data?.accessToken;
            const refreshToken = res.data?.data?.refreshToken;
            if (!accessToken) throw new Error("No access token");
            setAuthTokens(accessToken, refreshToken || getRefreshToken());
            return accessToken;
          }).finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (_) {
        clearClientSession();
        if (window.location.pathname !== "/") window.location.href = "/";
        return Promise.reject(error);
      }
    }

    if (status === 401 && !authCall) {
      clearClientSession();
      if (window.location.pathname !== "/") window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;

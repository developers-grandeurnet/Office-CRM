const ACCESS_KEY = "crm_access_token";
const REFRESH_KEY = "crm_refresh_token";

export const getAccessToken = () => {
  try {
    return sessionStorage.getItem(ACCESS_KEY) || "";
  } catch (_) {
    return "";
  }
};

export const getRefreshToken = () => {
  try {
    return sessionStorage.getItem(REFRESH_KEY) || "";
  } catch (_) {
    return "";
  }
};

export const setAuthTokens = (accessToken, refreshToken) => {
  try {
    if (accessToken) sessionStorage.setItem(ACCESS_KEY, accessToken);
    else sessionStorage.removeItem(ACCESS_KEY);
    if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch (_) { /* ignore */ }
};

export const clearAuthTokens = () => {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch (_) { /* ignore */ }
};

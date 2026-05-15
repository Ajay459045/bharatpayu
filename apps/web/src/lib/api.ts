import axios from "axios";

const fallbackApiUrl = "http://localhost:4000/api/v1";

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || fallbackApiUrl;
  const absoluteUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;
  return absoluteUrl.replace(/\/+$/, "");
}

export function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api\/v\d+$/i, "");
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bharatpayu.accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

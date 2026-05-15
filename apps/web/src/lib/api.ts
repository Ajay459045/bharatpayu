import axios from "axios";

const fallbackApiUrl = "http://localhost:4000/api/v1";

function normalizeApiUrl(url: string) {
  const absoluteUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return absoluteUrl.replace(/\/+$|\s+$/g, "");
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return normalizeApiUrl(configuredUrl);
  }

  if (typeof window !== "undefined") {
    return normalizeApiUrl(`${window.location.origin}/api/v1`);
  }

  return normalizeApiUrl(fallbackApiUrl);
}

export function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api\/v\d+$/i, "");
}

export const api = axios.create({
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (!config.baseURL && config.url && !/^https?:\/\//i.test(config.url)) {
    config.baseURL = getApiBaseUrl();
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bharatpayu.accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

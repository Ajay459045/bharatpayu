import axios from "axios";

// Production builds must never fall back to localhost: browsers will either
// refuse the connection or block HTTP requests from the HTTPS site.
const fallbackApiUrl = "https://bharatpayu.com/api/v1";

export function getApiBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    fallbackApiUrl;

  const absoluteUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return absoluteUrl.replace(/\/$/, "");
}

export function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api\/v\d+$/i, "");
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bharatpayu.accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use((response) => {
  if (typeof window !== "undefined") {
    const accessToken = response.data?.accessToken;
    const approvalStatus = response.data?.user?.approvalStatus;

    if (accessToken) {
      localStorage.setItem("bharatpayu.accessToken", accessToken);
    }

    if (approvalStatus) {
      localStorage.setItem("bharatpayu.approvalStatus", approvalStatus);
    }
  }

  return response;
});

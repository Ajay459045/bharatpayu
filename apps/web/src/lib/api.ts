import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
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

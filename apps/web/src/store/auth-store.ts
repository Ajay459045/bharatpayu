"use client";

import { create } from "zustand";

type AuthState = {
  role: "super_admin" | "admin" | "distributor" | "retailer" | null;
  identifier: string | null;
  setSession: (role: AuthState["role"], identifier: string, token: string, approvalStatus?: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  identifier: null,
  setSession: (role, identifier, token, approvalStatus) => {
    localStorage.setItem("bharatpayu.accessToken", token);
    if (approvalStatus) localStorage.setItem("bharatpayu.approvalStatus", approvalStatus);
    set({ role, identifier });
  },
  logout: () => {
    localStorage.removeItem("bharatpayu.accessToken");
    localStorage.removeItem("bharatpayu.approvalStatus");
    set({ role: null, identifier: null });
  }
}));

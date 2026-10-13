"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { ShopUser } from "@/lib/types";

export type Language = "en" | "ar";

type ShopContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  user: ShopUser | null;
  authLoading: boolean;
  authError: string;
  refreshUser: () => Promise<ShopUser | null>;
  clearUser: () => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const STORAGE_KEY = "bareeq-language";

export function ShopProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [user, setUser] = useState<ShopUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const current = await api<ShopUser | null>("/auth/me");
      setUser(current);
      setAuthError("");
      return current;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to load your account.");
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => setUser(null), []);

  useEffect(() => {
    void refreshUser();
    // Re-validate the session when returning to the tab so another-tab logout or deactivation is reflected.
    const onFocus = () => { if (document.visibilityState === "visible") void refreshUser(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshUser]);

  return (
    <ShopContext.Provider value={{ language, setLanguage, user, authLoading, authError, refreshUser, clearUser }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used inside ShopProvider");
  return context;
}

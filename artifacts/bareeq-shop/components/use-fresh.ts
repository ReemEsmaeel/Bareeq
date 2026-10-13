"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/client";
import { useShop } from "./shop-provider";

export type ScopedStatus = "auth" | "unauthenticated" | "loading" | "ready" | "error";

/**
 * Loads a user-scoped resource. Data is reset the moment the signed-in user changes,
 * responses from a previous user/scope or superseded requests are ignored, and the
 * resource re-fetches when the tab regains focus.
 */
export function useScopedResource<T>(path: string) {
  const { user, authLoading } = useShop();
  const userId = user?.id ?? null;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [status, setStatus] = useState<ScopedStatus>("auth");
  const scopeRef = useRef(0);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const activeRef = useRef<{ userId: string | null; path: string }>({ userId: null, path });

  const reload = useCallback(async (): Promise<boolean> => {
    const scope = scopeRef.current;
    const request = ++requestRef.current;
    if (!activeRef.current.userId) return false;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const current = () => !controller.signal.aborted && scope === scopeRef.current && request === requestRef.current;
    try {
      const result = await api<T>(activeRef.current.path);
      if (!current()) return false;
      setData(result);
      setError("");
      setErrorStatus(null);
      setStatus("ready");
      return true;
    } catch (err) {
      if (!current()) return false;
      const code = err instanceof ApiError ? err.status : null;
      if (code === 401) {
        setData(null);
        setStatus("unauthenticated");
        return false;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setErrorStatus(code);
      setStatus("error");
      return false;
    }
  }, []);

  // Reset synchronously-ish on any scope change (user, auth state, path).
  useEffect(() => {
    scopeRef.current += 1;
    controllerRef.current?.abort();
    activeRef.current = { userId, path };
    setData(null);
    setError("");
    setErrorStatus(null);
    if (authLoading) { setStatus("auth"); return; }
    if (!userId) { setStatus("unauthenticated"); return; }
    setStatus("loading");
    void reload();
    const onFocus = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      scopeRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [userId, authLoading, path, reload]);

  /** Returns a checker that is true only while the current user scope is unchanged. */
  const scopeGuard = useCallback(() => {
    const scope = scopeRef.current;
    return () => scope === scopeRef.current;
  }, []);

  // Data from a previous user is never returned while the new scope loads.
  const visibleData = activeRef.current.userId === userId ? data : null;

  return { data: visibleData, setData, error, errorStatus, status, reload, scopeGuard };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";

import { setTokenProvider } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import type { Me } from "@/src/api/types";

const TOKEN_KEY = "obh.authToken";

interface AuthState {
  /** null while restoring from storage on cold start. */
  ready: boolean;
  token: string | null;
  me: Me | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  // Keep a ref so the token provider handed to the API client always sees the latest value.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;
  useEffect(() => {
    setTokenProvider(() => tokenRef.current);
  }, []);

  const loadMe = useCallback(async () => {
    const profile = await api.fetchMe();
    setMe(profile);
  }, []);

  // Cold start: restore a saved token and confirm it still works.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved && !cancelled) {
          setToken(saved);
          tokenRef.current = saved;
          try {
            await loadMe();
          } catch {
            // Stale/rejected token — drop it.
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            if (!cancelled) {
              setToken(null);
              tokenRef.current = null;
            }
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { token: newToken } = await api.login(username.trim(), password);
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      setToken(newToken);
      tokenRef.current = newToken;
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Even if the server call fails, clear locally.
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    tokenRef.current = null;
    setMe(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, token, me, signIn, signOut, refreshMe: loadMe }),
    [ready, token, me, signIn, signOut, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

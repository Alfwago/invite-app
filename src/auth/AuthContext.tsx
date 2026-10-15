import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";

import { setTokenProvider, setUnauthorizedHandler } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import type { Me } from "@/src/api/types";
import { skateCardSignOut } from "@/modules/skate-card";
import { registerForPush, unregisterForPush } from "@/src/push";

export const TOKEN_KEY = "obh.authToken";

interface AuthState {
  /** null while restoring from storage on cold start. */
  ready: boolean;
  token: string | null;
  me: Me | null;
  signIn: (username: string, password: string, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const qc = useQueryClient();

  // The token the API client sends. A ref so the provider always sees the
  // latest value; every place that changes `token` sets it too. (Until
  // 1.6.2 it was also copied from state on every render, which during
  // sign-in briefly reset it to null — so the push registration that
  // follows sign-in went out without a token and got a 401.)
  const tokenRef = useRef<string | null>(null);
  // True once a token is committed (restored or signed in) — a 401 during
  // the sign-in attempt itself isn't a "you've been signed out".
  const signedInRef = useRef(false);
  useEffect(() => {
    setTokenProvider(() => tokenRef.current);
  }, []);

  // The server rejected our token (signed out on another device, token
  // revoked): sign out here too, once, without calling the server — every
  // further call would only be another 401. Clearing the token takes the
  // app to the login screen (RootNavigator) and stops all queries.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!signedInRef.current) return;
      signedInRef.current = false;
      tokenRef.current = null;
      void (async () => {
        await skateCardSignOut();
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch {
          // best-effort; the token is already dropped in memory
        }
        setToken(null);
        setMe(null);
        qc.clear();
        Alert.alert("Signed out", "You've been signed out. Please log in again.");
      })();
    });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

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
          signedInRef.current = true;
          try {
            await loadMe();
            registerForPush();
          } catch {
            // Stale/rejected token — drop it.
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            signedInRef.current = false;
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
    async (username: string, password: string, remember = true) => {
      const { token: newToken } = await api.login(username.trim(), password);
      // Make the token available for the /api/me/ call, but don't commit it to
      // state/storage (which triggers navigation into the app) until we know it works.
      tokenRef.current = newToken;
      try {
        await loadMe();
      } catch (e) {
        tokenRef.current = null;
        throw e;
      }
      // "Keep me signed in": persist the token so a cold start restores it.
      // Otherwise keep it in memory only and clear any previously saved token,
      // so quitting the app signs the user out.
      if (remember) {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      setToken(newToken);
      signedInRef.current = true;
      registerForPush();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    await unregisterForPush();
    await skateCardSignOut();
    try {
      await api.logout();
    } catch {
      // Even if the server call fails, clear locally.
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    signedInRef.current = false;
    setToken(null);
    tokenRef.current = null;
    setMe(null);
    qc.clear(); // the next person to sign in mustn't see this one's data
  }, [qc]);

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

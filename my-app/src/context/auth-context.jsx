import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, loginRequest, meRequest, registerRequest } from '../services/api';

const TOKEN_KEY = 'wearx_auth_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // isLoading: true while we're checking SecureStore for a saved token on
  // app start. The splash screen waits for this before deciding where to
  // send the user, so nobody sees a flash of the login screen by mistake.
  const [isLoading, setIsLoading] = useState(true);

  // isSubmitting: true only while a register/login request is in flight —
  // screens use this to disable the button and show a spinner.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // On app start: is there a saved token, and is it still valid?
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!savedToken) return;

        // Don't just trust a saved token — confirm it's still valid and
        // pull the current user data, in case it expired or was revoked.
        const result = await meRequest(savedToken);
        if (!alive) return;

        setToken(savedToken);
        setUser(result.data);
      } catch {
        // Invalid/expired token — clear it so we don't keep retrying.
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const register = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const result = await registerRequest(payload);
      await SecureStore.setItemAsync(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.data);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
      return { success: false, message };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const login = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const result = await loginRequest(payload);
      await SecureStore.setItemAsync(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.data);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
      return { success: false, message };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      isLoading,
      isSubmitting,
      register,
      login,
      logout,
    }),
    [token, user, isLoading, isSubmitting, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be called from inside an <AuthProvider>');
  }
  return ctx;
}
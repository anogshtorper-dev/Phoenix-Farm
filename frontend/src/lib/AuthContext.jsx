// src/lib/AuthContext.jsx
// Replaces Base44 auth entirely with JWT-based local auth.
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi } from '@/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(authApi.getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isLoggedIn);
  const [isLoadingAuth, setIsLoadingAuth]   = useState(true);

  // On mount, verify the stored token is still valid
  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      setIsLoadingAuth(false);
      return;
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        setIsAuthenticated(true);
      })
      .catch(() => {
        authApi.clearSession();
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    authApi.saveSession(result);
    setUser(result.user);
    setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(() => {
    authApi.clearSession();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  }, []);

  // navigateToLogin kept for Layout.jsx compatibility
  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      logout,
      navigateToLogin,
      // Shims for any remaining base44 auth references:
      appPublicSettings: null,
      authError: null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

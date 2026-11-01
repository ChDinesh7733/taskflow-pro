import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/authApi';
import { tokenStore } from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);

  /* On mount — if we have a stored access token, validate it with /me */
  useEffect(() => {
    (async () => {
      if (tokenStore.getAccess()) {
        try {
          const me = await authApi.me();
          setUser(me);
        } catch {
          tokenStore.clearTokens();
          setUser(null);
        }
      }
      setChecking(false);
    })();
  }, []);

  /* Listen for the silent-refresh failure event fired by axiosInstance */
  useEffect(() => {
    const handler = () => { setUser(null); };
    window.addEventListener('tf:session-expired', handler);
    return () => window.removeEventListener('tf:session-expired', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const demoLogin = useCallback(async () => {
    const data = await authApi.demoLogin();
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (displayName, email, password) => {
    const data = await authApi.register({ displayName, email, password });
    return data; // { message, user } — caller decides whether to auto-login
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    tokenStore.clearTokens();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(prev => prev ? { ...prev, ...updated } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, checking, login, register, demoLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

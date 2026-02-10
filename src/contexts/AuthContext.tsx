import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { User } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await authService.getMe();
      setUser(user);
    } catch {
      setUser(null);
      authService.setAccessToken(null);
    }
  }, []);

  // Check auth status on mount and when token changes
  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getAccessToken();
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    checkAuth();

    // Check for OAuth callback success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Remove query param from URL
      window.history.replaceState({}, '', window.location.pathname);
      refreshUser();
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await authService.register({ email, password, name });
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

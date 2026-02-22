import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email?: string;
  full_name?: string;
  gender?: string;
  profession?: string;
  source?: string;
  bio?: string;
  profile_image?: string;
  onboarding_completed: boolean;
  is_admin: boolean;
  credits_left: number;
  is_premium: boolean;
  devto_api_key?: string;
  hashnode_api_key?: string;
  hashnode_publication_id?: string;
  medium_token?: string; // NEW
  linkedin_access_token?: string;
  linkedin_urn?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Centralized API URL logic for the entire app
export const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
    // If no environment variable, use relative paths in production, and localhost in dev
    return import.meta.env.DEV ? 'http://localhost:8000' : '';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      refreshUser().finally(() => setIsLoading(false));
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setIsLoading(false);
    }
  }, [token]);

  const refreshUser = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/v1/auth/me`);
      setUser(res.data);
    } catch (e) {
      console.error("Failed to fetch user", e);
      logout();
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

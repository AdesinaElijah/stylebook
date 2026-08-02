import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPush, unregisterForPush } from '../services/push';

interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'OWNER';
  shopId?: string;
  emailVerified: boolean;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      // Set REMEMBER_LOGIN to false to always ask for login on restart
      // Set to true to stay logged in between restarts
      const REMEMBER_LOGIN = false;

      if (!REMEMBER_LOGIN) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setIsLoading(false);
        return;
      }

      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    // Claim this device's push token for the account that just signed in.
    // Deliberately not awaited — a slow or denied permission prompt shouldn't
    // hold up navigation into the app.
    registerForPush();
  };

  const logout = async () => {
    // Stop push before the auth token goes away, since the call needs it.
    await unregisterForPush();

    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
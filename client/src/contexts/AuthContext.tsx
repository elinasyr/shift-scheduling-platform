import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, SignupData } from '../types';
import * as api from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      api.setAuthToken(token);
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load current user:', err);
      localStorage.removeItem('token');
      api.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await api.login(email, password);
      const { token, user: userData } = response;
      
      localStorage.setItem('token', token);
      api.setAuthToken(token);
      setUser(userData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      setError(null);
      setLoading(true);
      
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const response = await api.signup(userData);
      const { token, user: newUser } = response;
      
      localStorage.setItem('token', token);
      api.setAuthToken(token);
      setUser(newUser);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Signup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.setAuthToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    signup,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

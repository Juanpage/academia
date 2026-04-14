'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from './api';

interface User {
  id: number;
  cedula: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  moodle_user_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (cedula: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = Cookies.get('token');
    if (storedToken) {
      setToken(storedToken);
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => { Cookies.remove('token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (cedula: string, password: string) => {
    const res = await authAPI.login({ cedula, password });
    const { token: newToken, user: newUser } = res.data;
    Cookies.set('token', newToken, { expires: 1, secure: true, sameSite: 'strict' });
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch (_) {}
    Cookies.remove('token');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

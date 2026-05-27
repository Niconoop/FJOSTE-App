import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface User {
  user_id: string;
  username: string;
  avatar_url?: string;
  role?: { name: string; isAdmin: boolean };
  is_admin?: boolean;
  trucky_role?: string;
  trucky_driver_id?: number | string;
  truckersmp_id?: number | string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: boolean;
  hasRole: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (t: string) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      const res = await axios.get(`${API_URL}/auth/me`);
      setUser(res.data);
      try { window.require('electron').ipcRenderer.send('set-auth-username', res.data.username); } catch(e) {}
    } catch (err) {
      console.error("Auth verify failed", err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("AuthProvider: Checke Token...", !!token);
    if (token) {
      fetchUser(token);
      try { 
        console.log("AuthProvider: Sende Token an Electron Main");
        window.require('electron').ipcRenderer.send('set-auth-token', token); 
      } catch(e) {
        console.warn("AuthProvider: IPC fehlgeschlagen (evtl. kein Electron-Kontext)");
      }
    } else {
      setLoading(false);
      try { 
        window.require('electron').ipcRenderer.send('set-auth-token', null); 
      } catch(e) {}
    }
  }, [token, fetchUser]);

  // Periodically verify token is still valid
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    const newToken = res.data.token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(res.data.user);
    try { window.require('electron').ipcRenderer.send('set-auth-token', newToken); } catch(e) {}
    try { window.require('electron').ipcRenderer.send('set-auth-username', res.data.user.username); } catch(e) {}
  };

  const register = async (username: string, password: string, inviteCode: string) => {
    const res = await axios.post(`${API_URL}/management/register`, { username, password, invite_code: inviteCode });
    const newToken = res.data.token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    const me = await axios.get(`${API_URL}/auth/me`);
    try { window.require('electron').ipcRenderer.send('set-auth-username', me.data.username); } catch(e) {}
    setUser(me.data);
    try { window.require('electron').ipcRenderer.send('set-auth-token', newToken); } catch(e) {}
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    try { window.require('electron').ipcRenderer.send('set-auth-token', null); } catch(e) {}
  };

  const isAdmin = 
    user?.is_admin === true || 
    user?.role === 'admin' || 
    (typeof user?.role === 'object' && (user?.role as any)?.isAdmin === true) ||
    (typeof user?.role === 'object' && (user?.role as any)?.name === 'admin');

  useEffect(() => {
    if (user) {
      console.log("AuthContext: User geladen", user.username, "isAdmin:", isAdmin);
    }
  }, [user, isAdmin]);

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    if (isAdmin) return true;
    const userRoleStr = (typeof user.role === 'object' ? user.role.name : String(user.role || "")).toLowerCase().trim();
    const truckyRole = (user.trucky_role || "").toLowerCase().trim();
    return allowedRoles.some(r => {
      const lr = r.toLowerCase();
      return lr === truckyRole || lr === userRoleStr;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAdmin, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

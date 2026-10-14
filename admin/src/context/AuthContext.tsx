import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateCredentials, updateAdminCredentials, getAuthRecord } from '../db';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changeCredentials: (
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'kaku_admin_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check existing session in sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.username && parsed?.token) {
          setIsAuthenticated(true);
          setCurrentUser(parsed.username);
        }
      }
    } catch (e) {
      console.warn('Error al leer sesión:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Artificial slight delay (250-400ms) to prevent timing attacks & give smooth mobile feedback
      await new Promise(r => setTimeout(r, 350));

      const isValid = await validateCredentials(username, password);
      if (!isValid) {
        return {
          success: false,
          error: 'Usuario o contraseña incorrectos. Por favor, intentá nuevamente.'
        };
      }

      // Valid session
      const sessionData = {
        username: username.trim(),
        token: `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        loginAt: new Date().toISOString()
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

      setIsAuthenticated(true);
      setCurrentUser(username.trim());
      return { success: true };
    } catch (err: any) {
      console.error('Error durante login:', err);
      return {
        success: false,
        error: 'Ocurrió un error al procesar el ingreso. Intentá nuevamente.'
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const changeCredentials = async (
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentAuth = await getAuthRecord();
      const isCurrentValid = await validateCredentials(currentAuth.username, currentPassword);
      if (!isCurrentValid) {
        return {
          success: false,
          error: 'La contraseña actual no es correcta.'
        };
      }

      if (!newUsername.trim() || newUsername.trim().length < 3) {
        return {
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres.'
        };
      }

      if (!newPassword || newPassword.length < 5) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 5 caracteres.'
        };
      }

      await updateAdminCredentials(newUsername.trim(), newPassword);
      setCurrentUser(newUsername.trim());

      // Update active session
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ ...parsed, username: newUsername.trim() })
        );
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Error al actualizar credenciales: ${err.message}`
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        isLoading,
        login,
        logout,
        changeCredentials
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

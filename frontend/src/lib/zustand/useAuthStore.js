/**
 * 인증 상태 관리 Zustand 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      
      // Actions
      login: (user, token, refreshToken) => set({ 
        user, 
        token, 
        refreshToken,
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        refreshToken: null,
        isAuthenticated: false 
      }),
      
      updateUser: (userData) => set((state) => ({ 
        user: { ...state.user, ...userData } 
      })),
      
      setTokens: (accessToken, refreshToken) => set({
        token: accessToken,
        refreshToken: refreshToken
      }),
      
      clearTokens: () => set({
        token: null,
        refreshToken: null,
        isAuthenticated: false
      }),
      
      // Getters
      getUser: () => get().user,
      getToken: () => get().token,
      getRefreshToken: () => get().refreshToken,
      isLoggedIn: () => get().isAuthenticated,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        refreshToken: state.refreshToken, // Access Token은 메모리에만
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

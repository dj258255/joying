/**
 * 지역 설정 관리 Zustand 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set, get) => ({
      // State
      currentLocation: null,
      recentLocations: [],
      
      // Actions
      setLocation: (location) => set({ currentLocation: location }),
      
      addRecentLocation: (location) => set((state) => ({
        recentLocations: [
          location,
          ...state.recentLocations
            .filter(loc => loc.id !== location.id)
            .slice(0, 4) // 최대 5개까지 저장
        ]
      })),
      
      clearRecentLocations: () => set({ recentLocations: [] }),
      
      removeRecentLocation: (locationId) => set((state) => ({
        recentLocations: state.recentLocations.filter(loc => loc.id !== locationId)
      })),
      
      // Getters
      getCurrentLocation: () => get().currentLocation,
      getRecentLocations: () => get().recentLocations,
      hasLocation: () => !!get().currentLocation,
    }),
    {
      name: 'location-storage',
    }
  )
);

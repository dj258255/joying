/**
 * 찜하기 관리 Zustand 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLikedStore = create(
  persist(
    (set, get) => ({
      // State
      likedProducts: [],
      
      // Actions
      toggleLike: (productId) => set((state) => {
        const isLiked = state.likedProducts.includes(productId);
        return {
          likedProducts: isLiked
            ? state.likedProducts.filter(id => id !== productId)
            : [...state.likedProducts, productId]
        };
      }),
      
      addLike: (productId) => set((state) => ({
        likedProducts: state.likedProducts.includes(productId)
          ? state.likedProducts
          : [...state.likedProducts, productId]
      })),
      
      removeLike: (productId) => set((state) => ({
        likedProducts: state.likedProducts.filter(id => id !== productId)
      })),
      
      clearLikes: () => set({ likedProducts: [] }),
      
      // Bulk operations
      addMultipleLikes: (productIds) => set((state) => ({
        likedProducts: [...new Set([...state.likedProducts, ...productIds])]
      })),
      
      removeMultipleLikes: (productIds) => set((state) => ({
        likedProducts: state.likedProducts.filter(id => !productIds.includes(id))
      })),
      
      // Getters
      isLiked: (productId) => get().likedProducts.includes(productId),
      getLikedProducts: () => get().likedProducts,
      getLikedCount: () => get().likedProducts.length,
      hasLikedProducts: () => get().likedProducts.length > 0,
    }),
    {
      name: 'liked-storage',
    }
  )
);

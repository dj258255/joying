/**
 * API Endpoints Constants
 * API 엔드포인트 상수들
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    VALIDATE: '/auth/validate'
  },

  // User
  USER: {
    BASE: '/users',
    PROFILE: '/users/profile',
    ACCOUNT: '/users/account'
  },

  // Member
  MEMBER: {
    BASE: '/members',
    BY_ID: (memberId) => `/members/${memberId}`,
    PROFILE_IMAGE: (memberId) => `/members/${memberId}/profile-image`
  },

  // Chat
  CHAT: {
    BASE: '/chats',
    MESSAGES: (chatId) => `/chats/${chatId}/messages`
  },

  // Product
  PRODUCT: {
    BASE: '/products',
    LIKE: (productId) => `/products/${productId}/like`,
    UNAVAILABLE_DATES: (productId) => `/products/${productId}/unavailable-dates`
  },

  // Payment
  PAYMENT: {
    BASE: '/payments',
    CANCEL: (paymentId) => `/payments/${paymentId}/cancel`,
    REFUND: (paymentId) => `/payments/${paymentId}/refund`,
    STATUS: (paymentId) => `/payments/${paymentId}/status`
  },

  // Review
  REVIEW: {
    BASE: '/reviews'
  },

  // Search
  SEARCH: {
    BASE: '/search',
    HASHTAGS: '/search/hashtags',
    CATEGORIES: '/search/categories'
  },

  // MyPage
  MYPAGE: {
    RENT_HISTORY: '/mypage/rent-history',
    REGISTERED_PRODUCTS: '/mypage/registered-products',
    LIKED_PRODUCTS: '/mypage/liked-products'
  }
};

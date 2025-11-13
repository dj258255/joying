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
    BY_ID: (productId) => `/products/${productId}`,
    LIKE: (productId) => `/products/${productId}/likes`,
    MY_LIKES: '/products/mylikes',
    UNAVAILABLE_DATES: (productId) => `/products/${productId}/unavailable-dates`
  },

  // Category
  CATEGORY: {
    LIST: '/category',
    DETAIL: (categoryId) => `/category/${categoryId}`
  },

  // Payment
  PAYMENT: {
    BASE: '/payments',
    CREATE: '/payments',
    CONFIRM: '/payments/confirm',
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
  },

  // File
  FILE: {
    BASE: '/files'
  },

  REGION: {
      SIDO_LIST: '/regions/sidos', // 시·도 목록 조회
      GUNGU_LIST: (sidoId) => `/regions/sidos/${sidoId}/gungus`, // 시도 ID로 구군 조회
      DONG_LIST: (gunguId) => `/regions/gungus/${gunguId}/dongs`, // 구군 ID로 동 조회
    },

  // Push Notification
  PUSH: {
    VAPID_PUBLIC_KEY: '/push/vapid-public-key',
    SUBSCRIBE: '/push/subscribe',
    UNSUBSCRIBE: '/push/unsubscribe'
  },

  // Account
  ACCOUNT: {
    VERIFY_START: '/accounts/verify/start',
    VERIFY_COMPLETE: '/accounts/verify/complete',
    TRANSACTIONS: '/accounts/transactions'
  },
};

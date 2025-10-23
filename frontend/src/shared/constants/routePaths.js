/**
 * Route Paths Constants
 * 라우트 경로 상수들
 */

export const ROUTE_PATHS = {
  // Auth
  LOGIN: '/login',
  LOGOUT: '/logout',

  // Main
  HOME: '/',
  SEARCH: '/search',
  SEARCH_RESULTS: '/search/results',

  // Product
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id) => `/products/${id}`,
  PRODUCT_CREATE: '/products/create',
  PRODUCT_EDIT: (id) => `/products/${id}/edit`,

  // Chat
  CHAT_LIST: '/chats',
  CHAT_ROOM: (id) => `/chats/${id}`,

  // Payment
  PAYMENT_CHECKOUT: '/payment/checkout',
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_FAIL: '/payment/fail',

  // Review
  REVIEWS: '/reviews',
  REVIEW_WRITE: '/reviews/write',
  REVIEW_EDIT: (id) => `/reviews/${id}/edit`,

  // MyPage
  MYPAGE: '/mypage',
  MYPAGE_RENT_HISTORY: '/mypage/rent-history',
  MYPAGE_LENT_HISTORY: '/mypage/lent-history',
  MYPAGE_REGISTERED_PRODUCTS: '/mypage/registered-products',
  MYPAGE_LIKED_PRODUCTS: '/mypage/liked-products',
  MYPAGE_PROFILE: '/mypage/profile',
  MYPAGE_ACCOUNT_VERIFY: '/mypage/account-verify',

  // User
  USER_PROFILE: (id) => `/users/${id}`,

  // Error
  NOT_FOUND: '/404',
  ERROR: '/error'
};

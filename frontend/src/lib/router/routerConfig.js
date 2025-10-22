/**
 * Router Configuration
 * 라우터 설정
 */

import { createBrowserRouter } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

// Lazy loading을 위한 컴포넌트 import
const LoginPage = () => import('@/features/auth/pages/LoginPage');
const ProductListPage = () => import('@/features/product/pages/ProductListPage');
const ChatListPage = () => import('@/features/chat/pages/ChatListPage');
const PaymentCheckoutPage = () => import('@/features/payment/pages/PaymentCheckoutPage');

// 라우터 설정
export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.LOGIN,
    element: React.lazy(LoginPage),
  },
  {
    path: ROUTE_PATHS.HOME,
    element: React.lazy(ProductListPage),
  },
  {
    path: ROUTE_PATHS.PRODUCTS,
    element: React.lazy(ProductListPage),
  },
  {
    path: ROUTE_PATHS.CHAT_LIST,
    element: React.lazy(ChatListPage),
  },
  {
    path: ROUTE_PATHS.PAYMENT_CHECKOUT,
    element: React.lazy(PaymentCheckoutPage),
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    element: <div>404 - 페이지를 찾을 수 없습니다</div>,
  },
]);

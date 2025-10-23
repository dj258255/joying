/**
 * App Component
 * 메인 애플리케이션 컴포넌트
 */

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

// Lazy loading을 위한 컴포넌트 import
const HomePage = React.lazy(() => import('@/features/home/pages/HomePage'))
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage'))
const ProductListPage = React.lazy(() => import('@/features/product/pages/ProductListPage'))
const ChatListPage = React.lazy(() => import('@/features/chat/pages/ChatListPage'))
const PaymentCheckoutPage = React.lazy(() => import('@/features/payment/pages/PaymentCheckoutPage'))

function App() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">로딩 중...</div>
      </div>}>
        <Routes>
          <Route path={ROUTE_PATHS.HOME} element={<HomePage />} />
          <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
          <Route path={ROUTE_PATHS.PRODUCTS} element={<ProductListPage />} />
          <Route path={ROUTE_PATHS.CHAT_LIST} element={<ChatListPage />} />
          <Route path={ROUTE_PATHS.PAYMENT_CHECKOUT} element={<PaymentCheckoutPage />} />
          <Route path="*" element={<div>404 - 페이지를 찾을 수 없습니다</div>} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  )
}

export default App

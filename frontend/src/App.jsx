/**
 * App Component
 * 메인 애플리케이션 컴포넌트
 */

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { ROUTE_PATHS } from '@/shared/constants'
import { ChatProvider } from '@/features/chat/contexts/ChatContext'

// Lazy loading을 위한 컴포넌트 import
const HomePage = React.lazy(() => import('@/features/home/pages/HomePage'))
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage'))
const ProductListPage = React.lazy(() => import('@/features/product/pages/ProductListPage'))
const ProductDetailPage = React.lazy(() => import('@/features/product/pages/ProductDetailPage'))
const ChatListPage = React.lazy(() => import('@/features/chat/pages/ChatListPage'))
const ChatRoomPage = React.lazy(() => import('@/features/chat/pages/ChatRoomPage'))
const PaymentCheckoutPage = React.lazy(() => import('@/features/payment/pages/PaymentCheckoutPage'))
const MyPageMain = React.lazy(() => import('@/features/mypage/pages/MyPageMain'))
const UserProfilePage = React.lazy(() => import('@/features/mypage/pages/UserProfilePage'))

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
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path={ROUTE_PATHS.CHAT_LIST} element={<ChatListPage />} />
          <Route path="/chats/:chatRoomId" element={
            <ChatProvider>
              <ChatRoomPage />
            </ChatProvider>
          } />
          <Route path={ROUTE_PATHS.PAYMENT_CHECKOUT} element={<PaymentCheckoutPage />} />
          <Route path={ROUTE_PATHS.MYPAGE} element={<MyPageMain />} />
          <Route path="/members/:memberId" element={<UserProfilePage />} />
          <Route path="*" element={<div>404 - 페이지를 찾을 수 없습니다</div>} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  )
}

export default App
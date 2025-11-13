/**
 * App Component
 * 메인 애플리케이션 컴포넌트
 */

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { ROUTE_PATHS } from '@/shared/constants'
import { ChatProvider } from '@/features/chat/contexts/ChatContext'
import { AuthProvider } from '@/features/auth/contexts/AuthContext'
import { GlobalPresenceProvider } from '@/shared/contexts/GlobalPresenceContext'
import ProtectedRoute from '@/features/auth/components/ProtectedRoute'
// import { PushNotificationInitializer } from '@/features/push/components/PushNotificationInitializer' // TODO: 백엔드 VAPID API 준비 후 활성화

// Lazy loading을 위한 컴포넌트 import
const HomePage = React.lazy(() => import('@/features/home/pages/HomePage'))
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage'))
const OAuth2CallbackPage = React.lazy(() => import('@/features/auth/pages/OAuth2CallbackPage'))
const ProductListPage = React.lazy(() => import('@/features/product/pages/ProductListPage'))
const ProductDetailPage = React.lazy(() => import('@/features/product/pages/ProductDetailPage'))
const ProductCreatePage = React.lazy(() => import('@/features/product/pages/ProductCreatePage'))
const ChatListPage = React.lazy(() => import('@/features/chat/pages/ChatListPage'))
const ChatRoomPage = React.lazy(() => import('@/features/chat/pages/ChatRoomPage'))
const PaymentCheckoutPage = React.lazy(() => import('@/features/payment/pages/PaymentCheckoutPage'))
const PaymentSuccessPage = React.lazy(() => import('@/features/payment/pages/PaymentSuccessPage'))
const PaymentFailPage = React.lazy(() => import('@/features/payment/pages/PaymentFailPage'))
const MyPageMain = React.lazy(() => import('@/features/mypage/pages/MyPageMain'))
const UserProfilePage = React.lazy(() => import('@/features/mypage/pages/UserProfilePage'))
const BorrowedHistoryPage = React.lazy(() => import('@/features/mypage/pages/BorrowedHistoryPage'))
const LentHistoryPage = React.lazy(() => import('@/features/mypage/pages/LentHistoryPage'))
const RentalApiTestPage = React.lazy(() => import('@/features/rental/pages/RentalApiTestPage'))
const ReviewListPage = React.lazy(() => import('@/features/review/pages/ReviewListPage'))
const ReviewWritePage = React.lazy(() => import('@/features/review/pages/ReviewWritePage'))
const AccountTransactionPage = React.lazy(() => import('@/features/mypage/pages/AccountTransactionPage'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GlobalPresenceProvider>
          <PushNotificationInitializer />
          <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="text-xl text-gray-600">로딩 중...</div>
          </div>}>
            <Routes>
            {/* 공개 라우트 */}
            <Route path={ROUTE_PATHS.HOME} element={<HomePage />} />
            <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuth2CallbackPage />} />
            <Route path={ROUTE_PATHS.PRODUCTS} element={<ProductListPage />} />
            <Route path="/reviews/product/:productId" element={<ReviewListPage type="product" />} />
            <Route path="/reviews/member/:memberId" element={<ReviewListPage type="member" />} />

            {/* 보호된 라우트 */}
            <Route path={ROUTE_PATHS.PRODUCT_CREATE} element={
              <ProtectedRoute>
                <ProductCreatePage />
              </ProtectedRoute>
            } />
            <Route path="/products/:id/edit" element={
              <ProtectedRoute>
                <ProductCreatePage />
              </ProtectedRoute>
            } />
            <Route path="/products/:id" element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            } />
            <Route path={ROUTE_PATHS.CHAT_LIST} element={
              <ProtectedRoute>
                <ChatListPage />
              </ProtectedRoute>
            } />
            <Route path="/chats/:chatRoomId" element={
              <ProtectedRoute>
                <ChatProvider>
                  <ChatRoomPage />
                </ChatProvider>
              </ProtectedRoute>
            } />
            <Route path={ROUTE_PATHS.PAYMENT_CHECKOUT} element={
              <ProtectedRoute>
                <PaymentCheckoutPage />
              </ProtectedRoute>
            } />
            <Route path={ROUTE_PATHS.PAYMENT_SUCCESS} element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            } />
            <Route path={ROUTE_PATHS.PAYMENT_FAIL} element={
              <ProtectedRoute>
                <PaymentFailPage />
              </ProtectedRoute>
            } />
            <Route path={ROUTE_PATHS.MYPAGE} element={
              <ProtectedRoute>
                <MyPageMain />
              </ProtectedRoute>
            } />
            <Route path="/members/:memberId" element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/mypage/borrowed/:rentalId" element={
              <ProtectedRoute>
                <BorrowedHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/mypage/lent/:rentalId" element={
              <ProtectedRoute>
                <LentHistoryPage />
              </ProtectedRoute>
            } />

            <Route path={ROUTE_PATHS.REVIEW_WRITE} element={
              <ProtectedRoute>
                <ReviewWritePage mode="create" />
              </ProtectedRoute>
            } />
            <Route path="/reviews/:reviewId/edit" element={
              <ProtectedRoute>
                <ReviewWritePage mode="edit" />
              </ProtectedRoute>
            } />
            
            {/* API 테스트 페이지 (개발용) */}
            <Route path="/test/rental-api" element={
              <ProtectedRoute>
                <RentalApiTestPage />
              </ProtectedRoute>
            } />
            
            {/* 계좌 거래 내역 조회 페이지 (1원 인증 코드 확인용) */}
            <Route path="/accounts/transactions" element={
              <ProtectedRoute>
                <AccountTransactionPage />
              </ProtectedRoute>
            } />
            
              <Route path="*" element={<div>404 - 페이지를 찾을 수 없습니다</div>} />
            </Routes>
          </React.Suspense>
        </GlobalPresenceProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
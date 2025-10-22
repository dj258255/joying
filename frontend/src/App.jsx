/**
 * App Component
 * 메인 애플리케이션 컴포넌트
 */

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

// MyPage import
const MyPageMain = React.lazy(() => import('@/features/mypage/pages/MyPageMain'))

function App() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div>로딩 중...</div>}>
        <Routes>
          <Route path="/" element={<div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">물품 대여 플랫폼</h1>
              <p className="text-gray-600 mb-8">다양한 물품을 대여하고 수익을 창출하세요</p>
              <a href="/mypage" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                마이페이지로 이동
              </a>
            </div>
          </div>} />
          <Route path="/mypage" element={<MyPageMain />} />
          <Route path="*" element={<div>404 - 페이지를 찾을 수 없습니다</div>} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  )
}

export default App

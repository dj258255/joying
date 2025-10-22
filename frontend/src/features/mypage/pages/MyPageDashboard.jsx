/**
 * MyPageDashboard Component
 * 마이페이지 대시보드 컴포넌트
 */

import React from 'react';
import { useRentHistory } from '../hooks/useRentHistory';
import { useLikedProducts } from '../hooks/useLikedProducts';

const MyPageDashboard = () => {
  const { rentHistory, isLoading: isRentHistoryLoading } = useRentHistory({ limit: 5 });
  const { likedProducts, isLoading: isLikedProductsLoading } = useLikedProducts({ limit: 5 });

  const stats = {
    totalRentals: rentHistory.length,
    totalLiked: likedProducts.length,
    activeRentals: rentHistory.filter(rental => rental.status === 'in_progress').length,
    completedRentals: rentHistory.filter(rental => rental.status === 'completed').length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-gray-600 mt-2">안녕하세요! 오늘도 좋은 하루 되세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    총 대여 횟수
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalRentals}회
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    완료된 대여
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedRentals}회
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    진행중인 대여
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeRentals}회
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">❤️</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    찜한 상품
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalLiked}개
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 최근 대여 내역 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              최근 대여 내역
            </h3>
            {isRentHistoryLoading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : rentHistory.length > 0 ? (
              <div className="space-y-3">
                {rentHistory.map((rental) => (
                  <div key={rental.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {rental.product?.image && (
                      <img
                        src={rental.product.image}
                        alt={rental.product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {rental.product?.title || '상품 정보 없음'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(rental.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rental.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : rental.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rental.status === 'completed' ? '완료' : 
                       rental.status === 'in_progress' ? '진행중' : '대기중'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-500">대여 내역이 없습니다.</div>
              </div>
            )}
          </div>
        </div>

        {/* 찜한 상품 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              찜한 상품
            </h3>
            {isLikedProductsLoading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : likedProducts.length > 0 ? (
              <div className="space-y-3">
                {likedProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {product.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('ko-KR').format(product.price)}원/일
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {product.location}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-500">찜한 상품이 없습니다.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPageDashboard;

/**
 * LikedProductsList Component
 * 관심 상품(찜한 상품) 목록 컴포넌트
 */

import React, { useState } from 'react';

const LikedProductsList = () => {
  const [sortBy, setSortBy] = useState('recent');

  // 더미 데이터
  const likedProducts = [
    {
      id: 'liked1',
      name: '아이폰 15 Pro',
      pricePerDay: 15000,
      deposit: 800000,
      images: ['https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=아이폰'],
      rating: 4.8,
      reviewCount: 24,
      ownerName: '최소유',
      ownerRating: 4.9,
      location: '서울 강남구',
      category: '전자제품',
      likedAt: '2024-01-20',
      isAvailable: true
    },
    {
      id: 'liked2',
      name: '에어팟 프로 2세대',
      pricePerDay: 3000,
      deposit: 200000,
      images: ['https://via.placeholder.com/300x200/10B981/FFFFFF?text=에어팟'],
      rating: 4.9,
      reviewCount: 156,
      ownerName: '정소유',
      ownerRating: 4.8,
      location: '서울 서초구',
      category: '전자제품',
      likedAt: '2024-01-18',
      isAvailable: true
    },
    {
      id: 'liked3',
      name: '소니 WH-1000XM5',
      pricePerDay: 8000,
      deposit: 300000,
      images: ['https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=소니'],
      rating: 4.7,
      reviewCount: 89,
      ownerName: '김소유',
      ownerRating: 4.6,
      location: '서울 마포구',
      category: '전자제품',
      likedAt: '2024-01-15',
      isAvailable: false
    },
    {
      id: 'liked4',
      name: '맥북 에어 M2',
      pricePerDay: 20000,
      deposit: 1000000,
      images: ['https://via.placeholder.com/300x200/059669/FFFFFF?text=맥북'],
      rating: 4.9,
      reviewCount: 67,
      ownerName: '박소유',
      ownerRating: 4.9,
      location: '서울 송파구',
      category: '전자제품',
      likedAt: '2024-01-12',
      isAvailable: true
    }
  ];

  const sortedProducts = [...likedProducts].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.likedAt) - new Date(a.likedAt);
      case 'price_low':
        return a.pricePerDay - b.pricePerDay;
      case 'price_high':
        return b.pricePerDay - a.pricePerDay;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">관심 상품</h2>
            <p className="text-gray-600 mt-1 text-sm lg:text-base">찜한 상품 목록을 확인하세요</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="recent">최근 찜한 순</option>
              <option value="price_low">가격 낮은 순</option>
              <option value="price_high">가격 높은 순</option>
              <option value="rating">평점 높은 순</option>
            </select>
          </div>
        </div>
      </div>

      {likedProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">아직 찜한 상품이 없습니다</p>
          <button className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            상품 둘러보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* 상품 이미지 */}
              <div className="relative">
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      대여 불가
                    </span>
                  </div>
                )}
                <button className="absolute top-3 right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* 상품 정보 */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                  {product.name}
                </h3>
                
                {/* 소유자 정보 */}
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm text-gray-600">소유자:</span>
                  <span className="text-sm font-medium text-gray-900">{product.ownerName}</span>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs text-gray-600">{product.ownerRating}</span>
                  </div>
                </div>

                {/* 가격 정보 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      {product.pricePerDay.toLocaleString()}원/일
                    </span>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm text-gray-600">{product.rating}</span>
                      <span className="text-xs text-gray-400">({product.reviewCount})</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    보증금: {product.deposit.toLocaleString()}원
                  </div>
                </div>

                {/* 위치 정보 */}
                <div className="flex items-center space-x-1 mb-4 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{product.location}</span>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex space-x-2">
                  <button 
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      product.isAvailable
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!product.isAvailable}
                  >
                    {product.isAvailable ? '대여하기' : '대여 불가'}
                  </button>
                  <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    상세보기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedProductsList;

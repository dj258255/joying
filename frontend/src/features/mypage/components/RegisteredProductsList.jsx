/**
 * RegisteredProductsList Component
 * 등록한 상품 목록 컴포넌트
 */

import React, { useState } from 'react';

const RegisteredProductsList = () => {
  const [filter, setFilter] = useState('all');

  // 더미 데이터
  const registeredProducts = [
    {
      id: 'product1',
      name: '캐논 EOS R5',
      description: '풀프레임 미러리스 카메라, 전문가용 고성능',
      pricePerDay: 40000,
      deposit: 200000,
      images: ['https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=캐논'],
      status: 'available',
      category: '전자제품',
      location: '서울 강남구',
      rating: 4.9,
      reviewCount: 24,
      rentalCount: 15,
      createdAt: '2024-01-01'
    },
    {
      id: 'product2',
      name: '닌텐도 스위치 OLED',
      description: '최신 OLED 모델, 휴대용 게임 콘솔',
      pricePerDay: 5000,
      deposit: 300000,
      images: ['https://via.placeholder.com/400x300/EF4444/FFFFFF?text=닌텐도'],
      status: 'rented',
      category: '게임',
      location: '서울 강남구',
      rating: 4.8,
      reviewCount: 18,
      rentalCount: 8,
      createdAt: '2024-01-05'
    },
    {
      id: 'product3',
      name: '아이패드 프로 12.9인치',
      description: 'M2 칩셋, 256GB, Apple Pencil 포함',
      pricePerDay: 15000,
      deposit: 500000,
      images: ['https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=아이패드'],
      status: 'unavailable',
      category: '전자제품',
      location: '서울 강남구',
      rating: 4.9,
      reviewCount: 32,
      rentalCount: 12,
      createdAt: '2024-01-10'
    }
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'available':
        return { text: '대여 가능', color: 'bg-green-100 text-green-800' };
      case 'rented':
        return { text: '대여 중', color: 'bg-blue-100 text-blue-800' };
      case 'unavailable':
        return { text: '대여 불가', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filteredProducts = registeredProducts.filter(product => {
    if (filter === 'all') return true;
    return product.status === filter;
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">등록한 상품</h2>
            <p className="text-gray-600 mt-1 text-sm lg:text-base">내가 등록한 상품을 관리하세요</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + 새 상품 등록
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all', label: '전체' },
            { key: 'available', label: '대여 가능' },
            { key: 'rented', label: '대여 중' },
            { key: 'unavailable', label: '대여 불가' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15V9h4v6H8z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">
            {filter === 'all' ? '아직 등록한 상품이 없습니다' : '해당 상태의 상품이 없습니다'}
          </p>
          {filter === 'all' && (
            <button className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
              첫 상품 등록하기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProducts.map((product) => {
            const statusInfo = getStatusInfo(product.status);
            return (
              <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {/* 상품 이미지 */}
                <div className="aspect-w-16 aspect-h-9">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* 상품 정보 */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* 상품 세부 정보 */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">일일 대여료</span>
                      <span className="text-lg font-bold text-blue-600">
                        {product.pricePerDay.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">보증금</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.deposit.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">위치</span>
                      <span className="text-sm text-gray-900">{product.location}</span>
                    </div>
                  </div>

                  {/* 통계 정보 */}
                  <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{product.rating}</span>
                      <span>({product.reviewCount})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15V9h4v6H8z" clipRule="evenodd" />
                      </svg>
                      <span>대여 {product.rentalCount}회</span>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      수정
                    </button>
                    <button className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      상세보기
                    </button>
                    <button className="bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors text-sm">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegisteredProductsList;

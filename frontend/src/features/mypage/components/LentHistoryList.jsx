/**
 * LentHistoryList Component
 * 내가 빌려준 내역 목록 컴포넌트
 */

import React from 'react';

const LentHistoryList = () => {
  // 더미 데이터
  const lentHistory = [
    {
      id: 'lent1',
      productName: '캐논 EOS R5',
      productImage: 'https://via.placeholder.com/200x150/7C3AED/FFFFFF?text=캐논',
      borrowerName: '이빌림',
      borrowerRating: 4.9,
      startDate: '2024-01-08',
      endDate: '2024-01-10',
      totalAmount: 80000,
      status: 'completed',
      reviewReceived: true
    },
    {
      id: 'lent2',
      productName: '닌텐도 스위치 OLED',
      productImage: 'https://via.placeholder.com/200x150/EF4444/FFFFFF?text=닌텐도',
      borrowerName: '최빌림',
      borrowerRating: 4.6,
      startDate: '2024-01-18',
      endDate: '2024-01-20',
      totalAmount: 30000,
      status: 'in_progress',
      reviewReceived: false
    },
    {
      id: 'lent3',
      productName: '에어팟 프로 2세대',
      productImage: 'https://via.placeholder.com/200x150/10B981/FFFFFF?text=에어팟',
      borrowerName: '정빌림',
      borrowerRating: 4.8,
      startDate: '2024-01-25',
      endDate: '2024-01-27',
      totalAmount: 15000,
      status: 'pending',
      reviewReceived: false
    }
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { text: '완료', color: 'bg-green-100 text-green-800' };
      case 'in_progress':
        return { text: '진행중', color: 'bg-blue-100 text-blue-800' };
      case 'pending':
        return { text: '대기중', color: 'bg-yellow-100 text-yellow-800' };
      case 'cancelled':
        return { text: '취소됨', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">내가 빌려준 내역</h2>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">대여해준 상품의 내역을 확인하세요</p>
      </div>

      {lentHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15V9h4v6H8z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">아직 대여해준 내역이 없습니다</p>
          <button className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            상품 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lentHistory.map((rental) => {
            const statusInfo = getStatusInfo(rental.status);
            return (
              <div key={rental.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  {/* 상품 이미지 */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={rental.productImage} 
                      alt={rental.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 상품 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {rental.productName}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">대여자:</span>
                          <span className="text-sm font-medium text-gray-900">{rental.borrowerName}</span>
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm text-gray-600">{rental.borrowerRating}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>

                    {/* 대여 기간 및 금액 */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">대여 기간:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {rental.startDate} ~ {rental.endDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">총 금액:</span>
                        <span className="ml-2 text-lg font-bold text-green-600">
                          {rental.totalAmount.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="mt-4 flex space-x-3">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        상세보기
                      </button>
                      {rental.status === 'in_progress' && (
                        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                          대여 관리
                        </button>
                      )}
                      {rental.status === 'pending' && (
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                          승인하기
                        </button>
                      )}
                      {rental.status === 'completed' && !rental.reviewReceived && (
                        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                          리뷰 확인
                        </button>
                      )}
                    </div>
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

export default LentHistoryList;

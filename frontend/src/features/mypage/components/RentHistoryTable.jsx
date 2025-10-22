/**
 * RentHistoryTable Component
 * 대여 내역 테이블 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Array} props.rentHistory - 대여 내역 데이터
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onReviewClick - 리뷰 작성 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const RentHistoryTable = ({ 
  rentHistory, 
  onProductClick, 
  onReviewClick, 
  isLoading = false 
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { text: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      'confirmed': { text: '확정', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { text: '진행중', color: 'bg-green-100 text-green-800' },
      'completed': { text: '완료', color: 'bg-gray-100 text-gray-800' },
      'cancelled': { text: '취소', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (rentHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">대여 내역이 없습니다.</div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          상품 둘러보기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          대여 내역
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          내가 대여한 상품들의 내역입니다.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대여자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대여 기간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rentHistory.map((rental) => (
              <tr key={rental.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {rental.product?.image ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={rental.product.image}
                          alt={rental.product.title}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">이미지 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {rental.product?.title || '상품 정보 없음'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {rental.product?.category || ''}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {rental.owner?.nickname || '알 수 없음'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {rental.owner?.location || ''}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{formatDate(rental.startDate)}</div>
                  <div className="text-gray-500">~ {formatDate(rental.endDate)}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(rental.totalAmount)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(rental.status)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onProductClick(rental.product?.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      상세보기
                    </button>
                    {rental.status === 'completed' && !rental.hasReview && (
                      <button
                        onClick={() => onReviewClick(rental.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        리뷰작성
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RentHistoryTable;

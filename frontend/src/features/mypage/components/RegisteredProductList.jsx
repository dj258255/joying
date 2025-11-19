/**
 * RegisteredProductList Component
 * 등록 상품 목록 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { productApi } from '../../../features/product/api/productApi';
import { ROUTE_PATHS } from '../../../shared/constants/routePaths';

/**
 * @param {Object} props
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onEditProduct - 상품 수정 핸들러
 * @param {Function} props.onDeleteProduct - 상품 삭제 핸들러
 */
const RegisteredProductList = ({ 
  onProductClick = () => {}, 
  onEditProduct = null, 
  onDeleteProduct = () => {} 
}) => {
  const navigate = useNavigate();
  
  // 삭제 확인 모달 상태
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 수정 핸들러 (기본 구현)
  const handleEditProduct = (product) => {
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      // 기본 동작: 수정 페이지로 이동
      const productId = product.id || product.productId;
      if (productId) {
        navigate(`/products/${productId}/edit`);
      }
    }
  };
  
  // 삭제 핸들러
  const handleDeleteProduct = (product) => {
    const productId = product.id || product.productId;
    if (productId) {
      setDeleteConfirmModal({
        productId,
        productTitle: product.title || '상품'
      });
    }
  };
  
  // 상태 관리
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortBy, setSortBy] = useState('productId');
  const [uploadTypeFilter, setUploadTypeFilter] = useState('ALL'); // 'ALL' | 'RENT' | 'BORROW'
  // RENT = 빌려드려요 (빌려줘요), BORROW = 빌려요 (구해요)
  
  // 상품 목록 조회
  const fetchProducts = async (page = 0, sort = 'productId') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await productApi.getMyProducts({
        page,
        size: pageSize,
        sort
      });
      
      setProducts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
      setCurrentPage(response.number || page);
    } catch (err) {
      
      setError(err.message || '상품 목록을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 초기 로드 및 정렬 변경 시
  useEffect(() => {
    fetchProducts(0, sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);
  
  // 페이지 변경
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchProducts(newPage, sortBy);
    }
  };
  
  // 정렬 변경
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(0);
  };
  
  // uploadType 필터링 (프론트엔드에서 필터링)
  // RENT = 빌려드려요, BORROW = 빌려요
  const filteredProducts = uploadTypeFilter === 'ALL' 
    ? products 
    : products.filter(product => product.uploadType === uploadTypeFilter);
  
  // 삭제 확인
  const confirmDelete = async () => {
    if (!deleteConfirmModal) return;
    
    const { productId } = deleteConfirmModal;
    
    try {
      setIsDeleting(true);
      await productApi.deleteProduct(productId);
      
      // 삭제 성공 시 모달 닫기 및 목록 새로고침
      setDeleteConfirmModal(null);
      
      // 현재 페이지의 상품이 모두 삭제된 경우 이전 페이지로 이동
      if (filteredProducts.length === 1 && currentPage > 0) {
        await fetchProducts(currentPage - 1, sortBy);
      } else {
        // 같은 페이지에서 새로고침
        await fetchProducts(currentPage, sortBy);
      }
      
      alert('상품이 삭제되었습니다.');
    } catch (err) {
      
      alert(err.response?.data?.message || err.message || '상품 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => fetchProducts(currentPage, sortBy)}
          className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2 rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200"
        >
          다시 시도
        </button>
      </div>
    );
  }
  
  // 상품 데이터 변환 (백엔드 응답 형식을 컴포넌트에서 사용하는 형식으로)
  const transformedProducts = filteredProducts.map(product => {
    const imageUrl = product.thumbnailUrl || (product.files && product.files.length > 0 ? product.files[0].url : null);
    
    // 장소 정보 추출
    const dongId = product.region?.dongId || product.dongId;
    const dong = product.region?.dong || product.dong || '';
    const sido = product.region?.sido || product.sido || '';
    const gugun = product.region?.gungu || product.gugun || '';
    
    return {
      id: product.productId,
      productId: product.productId,
      title: product.title,
      price: product.rentalFee,
      rentalFee: product.rentalFee,
      deposit: product.deposit,
      rating: product.rating || 0,
      thumbnailUrl: imageUrl, // ProductCard가 thumbnailUrl을 참조
      image: imageUrl, // 호환성 유지
      location: product.region 
        ? `${product.region.sido} ${product.region.gungu} ${product.region.dong}`
        : '',
      // 장소 정보 개별 필드 추가 (ProductCard의 장소 표시용)
      dongId: dongId,
      dong: dong,
      sido: sido,
      gugun: gugun,
      uploadType: product.uploadType,
      liked: product.liked || false,
      isAvailable: true // 백엔드에서 상태 정보가 없으면 기본값
    };
  });

  return (
    <div className="space-y-2 sm:space-y-4 pb-0">
      {/* 필터 및 정렬 컨트롤 - 항상 표시 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
        {/* uploadType 필터 */}
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={() => setUploadTypeFilter('ALL')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              uploadTypeFilter === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setUploadTypeFilter('BORROW')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              uploadTypeFilter === 'BORROW'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            빌려요
          </button>
          <button
            onClick={() => setUploadTypeFilter('RENT')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              uploadTypeFilter === 'RENT'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            빌려드려요
          </button>
        </div>
        
        {/* 정렬 선택 - 모바일에서 숨김 */}
        <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
          <label className="text-xs sm:text-sm text-gray-600">정렬:</label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="productId">등록 순</option>
            <option value="rating">평점 순</option>
          </select>
        </div>
      </div>

      {/* 상품 개수 표시 */}
      <div className="text-xs sm:text-sm text-gray-600">
        총 {totalElements}개의 상품 중 {transformedProducts.length}개 표시
      </div>

      {/* 상품이 없을 때 빈 상태 표시 */}
      {transformedProducts.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="text-gray-500 mb-4">
              {uploadTypeFilter !== 'ALL' 
                ? `${uploadTypeFilter === 'RENT' ? '빌려드려요' : '빌려요'} 상품이 없습니다.`
                : '등록된 상품이 없습니다.'}
            </div>
            <button 
              onClick={() => navigate(ROUTE_PATHS.PRODUCT_CREATE)}
              className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200 font-medium shadow-lg"
            >
              첫 상품 등록하기
            </button>
          </div>
        </div>
      ) : (
        /* 상품 그리드 - 모바일에서 8개까지만 보이고 스크롤 */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-4 lg:gap-6 max-h-[600px] lg:max-h-none overflow-y-auto scrollbar-hide pb-0">
          {transformedProducts.map((product) => (
            <ProductCard
              key={product.id || product.productId}
              product={product}
              onClick={() => navigate(`/products/${product.id || product.productId}`, {
                state: {
                  fromMyPage: true,
                  myPageState: {
                    activeTab: 'products',
                    productTab: 'registered'
                  }
                }
              })}
              onEdit={() => handleEditProduct(product)}
              onDelete={() => handleDeleteProduct(product)}
              actionType="menu"
              status={product.isAvailable ? 'available' : 'unavailable'}
              showStats={false}
              showDate={false}
            />
          ))}
        </div>
      )}
      
      {/* 삭제 확인 모달 - 화면 중앙 고정 */}
      {deleteConfirmModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          {/* 백드롭 */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            onClick={() => setDeleteConfirmModal(null)}
          />
          
          {/* 모달 컨테이너 - 중앙 정렬 */}
          <div 
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
            style={{
              position: 'relative',
              zIndex: 10000,
              maxWidth: '28rem',
              width: '100%'
            }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">상품 삭제</h3>
            <p className="text-gray-600 mb-6">
              정말로 <span className="font-semibold text-gray-900">"{deleteConfirmModal.productTitle}"</span> 상품을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-600 mt-2 block">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            이전
          </button>
          
          {/* 페이지 번호 표시 */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage >= totalPages - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default RegisteredProductList;

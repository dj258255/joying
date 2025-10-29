/**
 * Product API
 * 상품 관련 API 호출 함수
 */

import { DUMMY_LEND_PRODUCTS, DUMMY_BORROW_PRODUCTS, PRODUCT_TYPES } from '@/shared/constants/dummyData';

// 환경 변수로 Mock 모드 제어
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * 상품 목록 조회
 * @param {Object} params - 쿼리 파라미터
 * @param {string} params.type - 상품 타입 ('lend' | 'borrow')
 * @param {string} params.search - 검색어
 * @param {string} params.category - 카테고리
 * @param {number} params.minPrice - 최소 가격
 * @param {number} params.maxPrice - 최대 가격
 * @param {string} params.location - 지역
 * @param {number} params.minRating - 최소 평점
 * @param {boolean} params.sameDayRental - 당일 대여 가능 여부
 * @param {Array<string>} params.hashtags - 해시태그 배열
 * @param {string} params.startDate - 시작 날짜
 * @param {string} params.endDate - 종료 날짜
 * @param {number} params.page - 페이지 번호
 * @param {number} params.limit - 페이지 크기
 * @returns {Promise<{items: Array, total: number, page: number, limit: number}>}
 */
export const getProducts = async (params = {}) => {
  if (USE_MOCK) {
    // Mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        const {
          type = PRODUCT_TYPES.LEND,
          search = '',
          category = '',
          minPrice = 0,
          maxPrice = Infinity,
          location = '',
          minRating = 0,
          sameDayRental = false,
          hashtags = [],
          startDate = null,
          endDate = null,
          page = 1,
          limit = 20
        } = params;

        // 타입에 따라 데이터 선택
        let products = type === PRODUCT_TYPES.BORROW 
          ? [...DUMMY_BORROW_PRODUCTS] 
          : [...DUMMY_LEND_PRODUCTS];

        // 필터링 로직
        let filtered = products.filter(product => {
          // 검색어 필터
          if (search && !product.title.toLowerCase().includes(search.toLowerCase())) {
            return false;
          }

          // 카테고리 필터
          if (category && product.category !== category) {
            return false;
          }

          // 가격 범위 필터
          if (product.price < minPrice || product.price > maxPrice) {
            return false;
          }

          // 지역 필터
          if (location && !product.location.includes(location)) {
            return false;
          }

          // 평점 필터
          if (product.rating < minRating) {
            return false;
          }

          // 당일 대여 필터 (Mock에서는 모두 가능하다고 가정)
          if (sameDayRental) {
            // 실제로는 API에서 처리
          }

          // 해시태그 필터 (Mock에서는 제목으로 간단히 처리)
          if (hashtags.length > 0) {
            const hasMatchingHashtag = hashtags.some(tag => 
              product.title.toLowerCase().includes(tag.toLowerCase()) ||
              product.category.toLowerCase().includes(tag.toLowerCase())
            );
            if (!hasMatchingHashtag) {
              return false;
            }
          }

          return true;
        });

        // 페이지네이션
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = filtered.slice(startIndex, endIndex);

        resolve({
          items: paginatedProducts,
          total: filtered.length,
          page,
          limit,
          totalPages: Math.ceil(filtered.length / limit)
        });
      }, 300); // 300ms 지연으로 로딩 상태 시뮬레이션
    });
  }

  // 실제 API 호출
  // const { data } = await axiosInstance.get('/products', { params });
  // return data;
  
  throw new Error('API not implemented yet. Set VITE_USE_MOCK=true in .env');
};

/**
 * 상품 상세 조회
 * @param {string} id - 상품 ID
 * @returns {Promise<Object>}
 */
export const getProductById = async (id) => {
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const allProducts = [...DUMMY_LEND_PRODUCTS, ...DUMMY_BORROW_PRODUCTS];
        const product = allProducts.find(p => p.id === id);
        
        if (product) {
          resolve(product);
        } else {
          reject(new Error('Product not found'));
        }
      }, 200);
    });
  }

  // 실제 API 호출
  // const { data } = await axiosInstance.get(`/products/${id}`);
  // return data;
  
  throw new Error('API not implemented yet. Set VITE_USE_MOCK=true in .env');
};

/**
 * 상품 생성
 * @param {Object} productData - 상품 정보
 * @param {string} productData.type - 상품 타입 ('lend' | 'borrow')
 * @returns {Promise<Object>}
 */
export const createProduct = async (productData) => {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProduct = {
          id: `product_${Date.now()}`,
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        resolve(newProduct);
      }, 500);
    });
  }

  // 실제 API 호출
  // const { data } = await axiosInstance.post('/products', productData);
  // return data;
  
  throw new Error('API not implemented yet. Set VITE_USE_MOCK=true in .env');
};

/**
 * 상품 수정
 * @param {string} id - 상품 ID
 * @param {Object} productData - 수정할 정보
 * @returns {Promise<Object>}
 */
export const updateProduct = async (id, productData) => {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedProduct = {
          id,
          ...productData,
          updatedAt: new Date().toISOString()
        };
        resolve(updatedProduct);
      }, 500);
    });
  }

  // 실제 API 호출
  // const { data } = await axiosInstance.put(`/products/${id}`, productData);
  // return data;
  
  throw new Error('API not implemented yet. Set VITE_USE_MOCK=true in .env');
};

/**
 * 상품 삭제
 * @param {string} id - 상품 ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 300);
    });
  }

  // 실제 API 호출
  // await axiosInstance.delete(`/products/${id}`);
  
  throw new Error('API not implemented yet. Set VITE_USE_MOCK=true in .env');
};

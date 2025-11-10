/**
 * Product API
 * 상품 관련 API 호출 함수
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';
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
 * PATCH /products/{productId}
 * 
 * @param {string|number} productId - 상품 ID
 * @param {Object} productData - 수정할 정보
 * @param {string} [productData.uploadType] - 업로드 타입 (RENT, BORROW)
 * @param {string} [productData.title] - 제목
 * @param {string} [productData.content] - 내용
 * @param {number} [productData.deposit] - 보증금
 * @param {number} [productData.rentalFee] - 일일요금
 * @param {string} [productData.rentMethod] - 대여방법 (BOTH, ONLY_OFFLINE, ONLY_ONLINE)
 * @param {boolean} [productData.videoNecessary] - 영상 필수 여부
 * @param {number} [productData.categoryId] - 카테고리 id
 * @param {number} [productData.sidoId] - 시도id
 * @param {number} [productData.gunguId] - 군구id
 * @param {number} [productData.dongId] - 동 id
 * @param {string} [productData.startRent] - 대여 가능 시작날짜 (ISO8601)
 * @param {string} [productData.endRent] - 대여 가능 종료 날짜 (ISO8601, null이면 계속 대여 가능)
 * @param {Array<number>} [productData.fileIds] - 파일 id 리스트
 * @param {Array<string>} [productData.hashtags] - 해시태그 리스트
 * @param {Array<Object>} [productData.rentalRefuses] - 렌탈 불가 날짜 리스트
 * @returns {Promise<Object>}
 */
export const updateProduct = async (productId, productData) => {
  // productId를 숫자로 변환
  const productIdNum = Number(productId);
  if (!productIdNum || isNaN(productIdNum) || productIdNum <= 0) {
    throw new Error('유효하지 않은 상품 ID입니다.');
  }
  
  try {
    console.log('[productApi] 상품 수정 요청:', { productId: productIdNum, productData });
    
    const response = await axiosInstance.patch(`/products/${productIdNum}`, productData);
    
    console.log('[productApi] 상품 수정 성공:', response.data);
    
    // 백엔드 응답 형식: ApiResponse.SuccessBody<ProductResponse>
    if (response.data?.body?.data) {
      return response.data.body.data;
    } else if (response.data?.data) {
      return response.data.data;
    }
    
    return response.data;
  } catch (error) {
    console.error('[productApi] 상품 수정 실패:', {
      productId: productIdNum,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    throw error;
  }
};

/**
 * 상품 삭제
 * DELETE /products/{productId}
 * 
 * @param {string|number} productId - 상품 ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  // productId를 숫자로 변환
  const productIdNum = Number(productId);
  if (!productIdNum || isNaN(productIdNum) || productIdNum <= 0) {
    throw new Error('유효하지 않은 상품 ID입니다.');
  }
  
  try {
    console.log('[productApi] 상품 삭제 요청:', { productId: productIdNum });
    
    await axiosInstance.delete(`/products/${productIdNum}`);
    
    console.log('[productApi] 상품 삭제 성공:', productIdNum);
  } catch (error) {
    console.error('[productApi] 상품 삭제 실패:', {
      productId: productIdNum,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    throw error;
  }
};

/**
 * 대여 불가 날짜 조회
 * @param {string|number} productId - 상품 ID
 * @returns {Promise<Array<string>} 대여 불가 날짜 배열 (YYYY-MM-DD 형식)
 */
export const getUnavailableDates = async (productId) => {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock 데이터: 빈 배열 반환
        resolve({ data: [] });
      }, 200);
    });
  }

  try {
    // 실제 API 호출
    const response = await axiosInstance.get(API_ENDPOINTS.PRODUCT.UNAVAILABLE_DATES(productId));
    return response.data;
  } catch (error) {
    // 404 에러는 조용히 처리 (API가 구현되지 않았을 수 있음)
    if (error.response?.status === 404) {
      console.log(`[productApi] unavailable-dates API가 구현되지 않음 (productId: ${productId})`);
      return { data: [] };
    }
    // 다른 에러는 그대로 throw
    throw error;
  }
};

/**
 * 대여 불가 날짜 설정
 * @param {string|number} productId - 상품 ID
 * @param {Object} data - 대여 불가 날짜 데이터
 * @param {Array<string>} data.dates - 대여 불가 날짜 배열 (YYYY-MM-DD 형식)
 * @returns {Promise<Object>}
 */
export const setUnavailableDates = async (productId, data) => {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { dates: data.dates } });
      }, 300);
    });
  }

  // 실제 API 호출
  const response = await axiosInstance.post(API_ENDPOINTS.PRODUCT.UNAVAILABLE_DATES(productId), data);
  return response.data;
};

/**
 * 등록한 상품 목록 조회
 * GET /products/myitems
 * 
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호 (기본: 0)
 * @param {number} params.size - 페이지 크기 (기본: 20)
 * @param {string} params.sort - 정렬 기준 ('productId' | 'rating', 기본: 'productId')
 * @returns {Promise<Object>} 페이징된 상품 목록
 */
export const getMyProducts = async (params = {}) => {
  const { page = 0, size = 20, sort = 'productId' } = params;
  
  try {
    const response = await axiosInstance.get('/products/myitems', {
      params: {
        page,
        size,
        sort
      }
    });
    
    // 백엔드 응답 형식: { body: { status: 200, message: "OK", data: { content: [...], ... } } }
    // axios는 response.data에 응답 본문을 담으므로 response.data.body.data에 실제 데이터가 있음
    
    let pageData = null;
    
    // Swagger 응답 형식 (우선 처리)
    if (response.data?.body?.data && typeof response.data.body.data === 'object') {
      pageData = response.data.body.data;
    }
    // 일반 응답 형식
    else if (response.data?.data && typeof response.data.data === 'object') {
      pageData = response.data.data;
    }
    // 직접 Page 객체가 오는 경우
    else if (response.data?.content !== undefined) {
      pageData = response.data;
    }
    
    if (pageData) {
      console.log('[productApi] 등록한 상품 목록 조회 성공:', {
        page,
        size,
        sort,
        totalElements: pageData.totalElements || 0,
        contentLength: pageData.content?.length || 0,
        uploadTypes: pageData.content?.map(p => p.uploadType) || []
      });
      
      return {
        content: pageData.content || [],
        pageable: pageData.pageable || {},
        totalElements: pageData.totalElements || 0,
        totalPages: pageData.totalPages || 0,
        size: pageData.size || size,
        number: pageData.number || page,
        first: pageData.first !== undefined ? pageData.first : (page === 0),
        last: pageData.last !== undefined ? pageData.last : false,
        numberOfElements: pageData.numberOfElements || 0,
        empty: pageData.empty !== undefined ? pageData.empty : (pageData.content?.length === 0)
      };
    }
    
    // 응답 구조가 예상과 다를 경우 상세 로그 출력
    console.error('[productApi] 예상하지 못한 응답 형식:', {
      responseData: response.data,
      responseDataType: typeof response.data,
      hasData: !!response.data?.data,
      hasBody: !!response.data?.body,
      hasContent: response.data?.content !== undefined
    });
    
    throw new Error('등록한 상품 목록 응답 형식이 올바르지 않습니다.');
  } catch (error) {
    console.error('[productApi] 등록한 상품 목록 조회 실패:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // 404 에러는 빈 목록 반환
    if (error.response?.status === 404) {
      return {
        content: [],
        pageable: {},
        totalElements: 0,
        totalPages: 0,
        size,
        number: page,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true
      };
    }
    
    throw error;
  }
};

/**
 * Product API 객체
 * 모든 함수를 객체로 묶어서 export
 */
export const productApi = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getUnavailableDates,
  setUnavailableDates,
  getMyProducts
};

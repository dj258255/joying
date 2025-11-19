/**
 * Product API
 * 상품 관련 API 호출 함수
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

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
  // 실제 API 호출
  try {
    
    const { data } = await axiosInstance.get(API_ENDPOINTS.PRODUCT.BASE, { params });
    
    
    // 응답 형식에 따라 데이터 추출
    let products = [];
    if (data?.body?.data?.content) {
      // Swagger 응답 형식
      products = data.body.data.content;
    } else if (data?.content) {
      // 직접 Page 객체
      products = data.content;
    } else if (data?.items) {
      // items 형식
      products = data.items;
    } else if (Array.isArray(data)) {
      // 배열 형식
      products = data;
    }
    
    // 각 상품에 liked 필드가 있는지 확인 (서버 응답 그대로 표시)
    :', products.map(p => ({ 
      productId: p.productId || p.id, 
      liked: p.liked,
      isLiked: p.isLiked,
      isLike: p.isLike,
      hasLikedField: 'liked' in p,
      hasIsLikedField: 'isLiked' in p,
      hasIsLikeField: 'isLike' in p
    })));
    
    return {
      items: products,
      total: data?.body?.data?.totalElements || data?.totalElements || data?.total || products.length,
      page: data?.body?.data?.number || data?.number || params.page || 1,
      limit: data?.body?.data?.size || data?.size || params.limit || 20,
      totalPages: data?.body?.data?.totalPages || data?.totalPages || Math.ceil(products.length / (params.limit || 20))
    };
  } catch (error) {
    
    throw error;
  }
};

/**
 * 상품 상세 조회
 * @param {string} id - 상품 ID
 * @returns {Promise<Object>}
 */
export const getProductById = async (id) => {
  // 실제 API 호출
  try {
    const { data } = await axiosInstance.get(`/products/${id}`);
    return data;
  } catch (error) {
    
    throw error;
  }
};

/**
 * 상품 생성
 * @param {Object} productData - 상품 정보
 * @param {string} productData.type - 상품 타입 ('lend' | 'borrow')
 * @returns {Promise<Object>}
 */
export const createProduct = async (productData) => {
  // 실제 API 호출
  try {
    const { data } = await axiosInstance.post('/products', productData);
    return data;
  } catch (error) {
    
    throw error;
  }
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
    
    
    const response = await axiosInstance.patch(`/products/${productIdNum}`, productData);
    
    
    
    // 백엔드 응답 형식: ApiResponse.SuccessBody<ProductResponse>
    if (response.data?.body?.data) {
      return response.data.body.data;
    } else if (response.data?.data) {
      return response.data.data;
    }
    
    return response.data;
  } catch (error) {
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
    
    
    await axiosInstance.delete(`/products/${productIdNum}`);
    
    
  } catch (error) {
    throw error;
  }
};

/**
 * 대여 불가 날짜 조회
 * @param {string|number} productId - 상품 ID
 * @returns {Promise<Array<string>} 대여 불가 날짜 배열 (YYYY-MM-DD 형식)
 */
export const getUnavailableDates = async (productId) => {
  try {
    // 실제 API 호출
    const response = await axiosInstance.get(API_ENDPOINTS.PRODUCT.UNAVAILABLE_DATES(productId));
    return response.data;
  } catch (error) {
    // 404 에러는 조용히 처리 (API가 구현되지 않았을 수 있음)
    if (error.response?.status === 404) {
      
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
      || []
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
    throw new Error('등록한 상품 목록 응답 형식이 올바르지 않습니다.');
  } catch (error) {
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
 * 상품 찜하기
 * @param {string} productId - 상품 ID
 * @returns {Promise<void>}
 */
export const likeProduct = async (productId) => {
  // 실제 API 호출
  try {
    const { data } = await axiosInstance.post(API_ENDPOINTS.PRODUCT.LIKE(productId));
    
    return data;
  } catch (error) {
    
    throw error;
  }
};

/**
 * 상품 찜하기 취소
 * @param {string} productId - 상품 ID
 * @returns {Promise<void>}
 */
export const unlikeProduct = async (productId) => {
  // 실제 API 호출
  try {
    const { data } = await axiosInstance.delete(API_ENDPOINTS.PRODUCT.LIKE(productId));
    
    return data;
  } catch (error) {
    
    throw error;
  }
};

/**
 * 찜한 상품 목록 조회
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호
 * @param {number} params.size - 페이지 크기
 * @returns {Promise<{content: Array, totalElements: number, totalPages: number}>}
 */
export const getLikedProducts = async (params = {}) => {
  // 실제 API 호출
  try {
    
    const { data } = await axiosInstance.get(API_ENDPOINTS.PRODUCT.MY_LIKES, { params });
    
    
    // 응답 형식에 따라 데이터 추출
    let result = data;
    if (data?.body?.data) {
      // Swagger 응답 형식
      result = data.body.data;
    } else if (data?.data) {
      // 중첩된 data 형식
      result = data.data;
    }
    
    // 각 상품에 liked 필드가 있는지 확인
    const content = result?.content || [];
    if (content.length > 0) {
      :', content.map(p => ({
        productId: p.productId || p.id,
        liked: p.liked,
        isLiked: p.isLiked,
        isLike: p.isLike,
        hasLikedField: 'liked' in p || 'isLiked' in p || 'isLike' in p
      })));
    }
    
    return result;
  } catch (error) {
    
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
  getMyProducts,
  likeProduct,
  unlikeProduct,
  getLikedProducts
};

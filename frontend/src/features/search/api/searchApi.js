/**
 * Search API functions
 * 통합 검색, 해시태그/카테고리 조회 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 검색 API
 */
export const searchApi = {
  /**
   * 통합 검색
   * @param {Object} params
   * @param {string} [params.q] - 검색어
   * @param {number} [params.price_min] - 최소 가격
   * @param {number} [params.price_max] - 최대 가격
   * @param {string} [params.region] - 지역
   * @param {string} [params.date_from] - 시작일 (ISO8601)
   * @param {string} [params.date_to] - 종료일 (ISO8601)
   * @param {number} [params.rating] - 최소 평점
   * @param {string} [params.method] - 거래 방법
   * @param {number[]} [params.category] - 카테고리 ID 목록
   * @param {string[]} [params.hashtag] - 해시태그 목록
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  search: async (params) => {
    console.log('🔍 [SearchAPI] 검색 시작:', { endpoint: '/search', params });
    console.log('📤 [SearchAPI] 전송 파라미터 상세:', {
      uploadType: params.uploadType,
      q: params.q || params.query,
      page: params.page,
      size: params.size,
      category: params.category,
      dong: params.dong,
      rating: params.rating,
      'price-min': params['price-min'],
      'price-max': params['price-max'],
      'date-from': params['date-from'],
      'date-to': params['date-to'],
      sameDayRental: params.sameDayRental
    });
    try {
      const response = await axiosInstance.get('/search', { params });
      console.log('[SearchAPI] 검색 성공 - 전체 응답:', response.data);
      console.log('[SearchAPI] 응답 구조 분석:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        dataType: typeof response.data,
        hasNestedData: !!response.data?.data,
        nestedDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        hasSearchResponses: !!response.data?.data?.searchResponses,
        searchResponsesLength: response.data?.data?.searchResponses?.length || 0
      });
      
      // 각 상품에 liked 필드가 있는지 확인
      const searchResponses = response.data?.data?.searchResponses || response.data?.searchResponses || [];
      console.log('[SearchAPI] 추출된 searchResponses:', {
        length: searchResponses.length,
        items: searchResponses.slice(0, 3) // 처음 3개만 로그
      });
      
      if (searchResponses.length > 0) {
        console.log('[SearchAPI] 상품 목록 (liked 필드 포함):', searchResponses.map(p => ({ 
          productId: p.productId || p.id, 
          liked: p.liked,
          isLiked: p.isLiked,
          isLike: p.isLike,
          hasLikedField: 'liked' in p || 'isLiked' in p || 'isLike' in p
        })));
        
        // liked 필드가 없는 상품이 있는지 확인
        const productsWithoutLiked = searchResponses.filter(p => !('liked' in p) && !('isLiked' in p) && !('isLike' in p));
        if (productsWithoutLiked.length > 0) {
          console.warn('[SearchAPI] liked 필드가 없는 상품:', productsWithoutLiked.map(p => ({
            productId: p.productId || p.id,
            title: p.title
          })));
        }
      } else {
        console.warn('[SearchAPI] ⚠️ searchResponses가 비어있습니다!');
      }
      
      return response;
    } catch (error) {
      console.error('[SearchAPI] 검색 실패:', error);
      console.error('[SearchAPI] 에러 상세:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url
      });
      throw error;
    }
  },

  /**
   * 자동완성 검색
   * @param {string} q - 검색어
   * @param {number} [limit=5] - 가져올 추천 개수
   * @returns {Promise<string[]>} 자동완성 추천어 리스트
   */
  autocomplete: async (q) => {
    if (!q?.trim()) return [];
    const res = await axiosInstance.get('/search/autocomplete', {
      params: { q },
    });
    return res.data;
  },
};

// Hashtag API
export const hashtagApi = {
  /**
   * 해시태그 목록 조회
   * @returns {Promise<Array>}
   */
  getHashtags: async () => {
    return await axiosInstance.get('/hashtag');
  },

  /**
   * 해시태그 생성
   * @param {Object} data
   * @param {string} data.name - 해시태그명
   * @returns {Promise<Object>}
   */
  createHashtag: async (data) => {
    return await axiosInstance.post('/hashtag', data);
  }
};

// Category API
export const categoryApi = {
  /**
   * 상위 카테고리 조회
   * @returns {Promise<Array>}
   */
  getCategories: async () => {
    return await axiosInstance.get('/category');
  },

  /**
   * 하위 카테고리 조회
   * @param {string} categoryId - 카테고리 ID
   * @returns {Promise<Array>}
   */
  getSubCategories: async (categoryId) => {
    return await axiosInstance.get(`/category/${categoryId}`);
  },

  /**
   * 카테고리 생성
   * @param {Object} data
   * @param {string} data.name - 카테고리명
   * @param {string} [data.parentId] - 부모 카테고리 ID
   * @returns {Promise<Object>}
   */
  createCategory: async (data) => {
    return await axiosInstance.post('/category', data);
  }
};

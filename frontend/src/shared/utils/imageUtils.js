/**
 * Image utility functions
 * 이미지 관련 유틸리티 함수들
 */

/**
 * 이미지 파일 유효성 검사
 * @param {File} file - 검사할 파일
 * @returns {boolean} 유효성 여부
 */
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

/**
 * 이미지 URL에서 썸네일 생성
 * @param {string} imageUrl - 원본 이미지 URL
 * @param {number} width - 썸네일 너비
 * @param {number} height - 썸네일 높이
 * @returns {string} 썸네일 URL
 */
export const generateThumbnail = (imageUrl, width = 200, height = 200) => {
  // TODO: 실제 이미지 리사이징 서비스 연동
  return `${imageUrl}?w=${width}&h=${height}&fit=crop`;
};

/**
 * 이미지 프리로드
 * @param {string} imageUrl - 프리로드할 이미지 URL
 * @returns {Promise} 프리로드 완료 Promise
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
};

/**
 * 여러 이미지 프리로드
 * @param {Array<string>} imageUrls - 프리로드할 이미지 URL 배열
 * @returns {Promise<Array>} 모든 이미지 프리로드 완료 Promise
 */
export const preloadImages = async (imageUrls) => {
  try {
    const promises = imageUrls.map(url => preloadImage(url));
    return await Promise.all(promises);
  } catch (error) {
    console.error('이미지 프리로드 실패:', error);
    throw error;
  }
};

/**
 * 이미지 압축
 * @param {File} file - 압축할 이미지 파일
 * @param {number} quality - 압축 품질 (0-1)
 * @param {number} maxWidth - 최대 너비
 * @param {number} maxHeight - 최대 높이
 * @returns {Promise<Blob>} 압축된 이미지 Blob
 */
export const compressImage = (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // 비율 유지하면서 리사이즈
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

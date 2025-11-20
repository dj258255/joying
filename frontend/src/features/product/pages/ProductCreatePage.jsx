/**
 * ProductCreatePage - 단계별 상품 등록 페이지
 * 화이트 베이스 + 검정 디자인
 * 좌측: 상품 상세 미리보기, 우측: 입력 폼, 하단: 진행도
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Lottie from 'lottie-react';
import { ROUTE_PATHS } from '@/shared/constants/routePaths';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';
import { axiosInstance } from '@/lib/axios/axiosInstance';
import { FiChevronLeft, FiChevronRight, FiX, FiTrash2, FiUpload, FiImage } from 'react-icons/fi';
import ImageGallery from '../components/ImageGallery';
import ProductInfo from '../components/ProductInfo';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { useCategoryTree } from '@/features/category';
import { useProductDetail } from '../hooks/useProductDetail';
import { useSidos, useGungus, useDongs } from '@/features/region/hooks/useRegions';
import { productApi } from '../api/productApi';
import { aiApi } from '../api/aiApi';
import celebrationAnimation from '../assets/Celebration.json';

const enumUploadTypes = [
  { label: '빌려드려요', value: 'RENT' },  // 백엔드 API: RENT
  { label: '빌려요', value: 'BORROW' },
];

const enumRentMethods = [
  { label: '모두 가능', value: 'BOTH' },
  { label: '직접 거래', value: 'ONLY_OFFLINE' },
  { label: '택배 거래', value: 'ONLY_ONLINE' },
];

const TOTAL_STEPS = 6;
const STEP_NAMES = ['이미지', '기본 정보', '상품 설명', '지역', '날짜 설정', '완료'];

function ProductCreatePage() {
  const navigate = useNavigate();
  const { id: productIdParam } = useParams();
  const { user } = useAuth();
  const USE_FAKE_API = false;
  
  // 수정 모드 확인
  const isEditMode = !!productIdParam;
  const productId = isEditMode ? Number(productIdParam) : null;
  
  // 수정 모드일 때 상품 상세 정보 조회
  const { product: existingProduct, isLoading: isProductLoading } = useProductDetail(
    isEditMode ? productId : null
  );

  // 단계 관리
  const [currentStep, setCurrentStep] = useState(1);

  // 폼 상태
  const [form, setForm] = useState({
    uploadType: 'RENT',  // 기본값: 빌려줘 (백엔드: RENT)
    title: '',
    content: '',
    deposit: '',
    rentalFee: '',
    rentMethod: 'BOTH',  // 기본값: 모두 가능
    videoNecessary: false,
    categoryId: null,
    sidoId: '',
    gunguId: '',
    dongId: '',
    startRent: '',
    endRent: '',
  });

  // 해시태그
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [recommendedHashtags, setRecommendedHashtags] = useState([]);
  const [showHashtagRecommendations, setShowHashtagRecommendations] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [hashtagMessage, setHashtagMessage] = useState('');
  const [hashtagMessageType, setHashtagMessageType] = useState(''); // 'error' | 'success' | ''
  
  // 가격 관련 메시지 상태
  const [priceMessage, setPriceMessage] = useState('');
  const [priceMessageType, setPriceMessageType] = useState(''); // 'error' | 'success' | ''
  const [priceMessageField, setPriceMessageField] = useState(''); // 'deposit' | 'rentalFee' | ''

  // 파일 업로드 상태
  const [fileIds, setFileIds] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [originalFiles, setOriginalFiles] = useState([]); // AI용 원본 파일 저장
  const [dragActive, setDragActive] = useState(false);
  const dndZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragItemIndex = useRef(null);
  const rightFormRef = useRef(null);
  const hashtagInputRef = useRef(null);
  const recommendedHashtagsRef = useRef(null);
  const hashtagButtonRef = useRef(null);

  // 날짜 관리
  const [rentalRefs, setRentalRefs] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('available');
  
  // 달력 클릭 상태: null -> 시작일 선택 -> 종료일 선택 -> 초기화
  const [calClickState, setCalClickState] = useState('none'); // 'none' | 'start' | 'end'
  const [calStart, setCalStart] = useState(null);
  const [calEnd, setCalEnd] = useState(null);
  const [noEndDate, setNoEndDate] = useState(false);

  // 종료일 없음 체크박스 토글 시 endRent 필드 업데이트
  useEffect(() => {
    if (form.startRent) {
      if (noEndDate) {
        // 체크박스 활성화 시 종료일 제거
        updateField('endRent', '');
      } else if (!form.endRent || form.endRent === '') {
        // 체크박스 비활성화 시, endRent가 비어있으면 시작일과 같은 날짜로 설정하지 않음
        // 사용자가 다시 캘린더에서 선택해야 함
      }
    }
  }, [noEndDate]);

  // 카테고리 관련 상태
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  
  // 카테고리 API 조회
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategoryTree();

  // 지역 관련 상태
  const [showRegionPopover, setShowRegionPopover] = useState(false);
  const [activeSidoId, setActiveSidoId] = useState(null);
  const [activeGunguId, setActiveGunguId] = useState(null);
  const [selectedRegionName, setSelectedRegionName] = useState('');
  
  // 지역 API 조회
  const { data: sidosData = [], isLoading: isSidosLoading } = useSidos();
  const { data: gungusData = [], isLoading: isGungusLoading } = useGungus(activeSidoId);
  const { data: dongsData = [], isLoading: isDongsLoading } = useDongs(activeGunguId);

  // 지역 데이터 가나다순 정렬
  const sidos = useMemo(() => {
    return [...sidosData].sort((a, b) => {
      const nameA = a.sidoName || a.name || '';
      const nameB = b.sidoName || b.name || '';
      return nameA.localeCompare(nameB, 'ko-KR');
    });
  }, [sidosData]);

  const gungus = useMemo(() => {
    return [...gungusData].sort((a, b) => {
      const nameA = a.gunguName || a.name || '';
      const nameB = b.gunguName || b.name || '';
      return nameA.localeCompare(nameB, 'ko-KR');
    });
  }, [gungusData]);

  const dongs = useMemo(() => {
    return [...dongsData].sort((a, b) => {
      const nameA = a.dongName || a.name || '';
      const nameB = b.dongName || b.name || '';
      return nameA.localeCompare(nameB, 'ko-KR');
    });
  }, [dongsData]);

  // 기타 상태
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI 자동 생성 상태
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // 카테고리 첫 번째 항목 자동 선택
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].categoryId);
    }
  }, [categories, activeCategoryId]);

  const parseNumber = (value) => {
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9]/g, '')) || 0;
  };

  const formatCurrency = (num) => {
    const n = Number(num) || 0;
    return `${n.toLocaleString()}원`;
  };

  // 카테고리 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (showCategoryPopover) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCategoryPopover]);

  // 지역 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (showRegionPopover) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showRegionPopover]);

  // 시도 첫 번째 항목 자동 선택
  useEffect(() => {
    if (sidos.length > 0 && !activeSidoId) {
      setActiveSidoId(sidos[0].sidoId || sidos[0].id);
    }
  }, [sidos, activeSidoId]);

  // 폼 상태 변경 디버깅
  useEffect(() => {
    console.log('[ProductCreatePage] 💰 폼 상태 변경:', {
      deposit: form.deposit,
      rentalFee: form.rentalFee,
      depositType: typeof form.deposit,
      rentalFeeType: typeof form.rentalFee
    });
  }, [form.deposit, form.rentalFee]);

  // 수정 모드일 때 기존 상품 정보를 폼에 채우기
  useEffect(() => {
    if (isEditMode && existingProduct && !isProductLoading) {
      console.log('[ProductCreatePage] 기존 상품 정보 로드:', existingProduct);
      
      // 기본 정보
      setForm(prev => ({
        ...prev,
        uploadType: existingProduct.uploadType || 'RENT',
        title: existingProduct.title || '',
        content: existingProduct.content || '',
        deposit: existingProduct.deposit ? String(existingProduct.deposit) : '',
        rentalFee: existingProduct.rentalFee ? String(existingProduct.rentalFee) : '',
        rentMethod: existingProduct.rentMethod || 'BOTH',
        videoNecessary: existingProduct.videoNecessary || false,
        categoryId: existingProduct.category?.categoryId || null,
        sidoId: existingProduct.sido?.sidoId || null,
        gunguId: existingProduct.gungu?.gunguId || null,
        dongId: existingProduct.dong?.dongId || null,
        startRent: existingProduct.startRent || '',
        endRent: existingProduct.endRent || '',
      }));
      
      // 카테고리 설정
      if (existingProduct.category?.categoryId) {
        setActiveCategoryId(existingProduct.category.categoryId);
        setSelectedCategoryName(existingProduct.category.categoryName || '');
      }
      
      // 해시태그
      if (existingProduct.hashtags && Array.isArray(existingProduct.hashtags)) {
        setHashtags(existingProduct.hashtags);
      }
      
      // 파일 정보
      if (existingProduct.files && Array.isArray(existingProduct.files)) {
        const fileIdList = existingProduct.files.map(f => f.fileId).filter(Boolean);
        const fileUrlList = existingProduct.files.map(f => f.url).filter(Boolean);
        setFileIds(fileIdList);
        setFilePreviews(fileUrlList);
      }
      
      // 대여 불가 날짜
      if (existingProduct.rentalRefuses && Array.isArray(existingProduct.rentalRefuses)) {
        setRentalRefs(existingProduct.rentalRefuses.map(ref => ({
          startRef: ref.startRef || ref.startRefuse,
          endRef: ref.endRef || ref.endRefuse
        })));
      }
      
      // 종료일 없음 여부
      if (!existingProduct.endRent) {
        setNoEndDate(true);
      }
      
      // 금액 필드 포맷팅 (화면 표시용)
      setTimeout(() => {
        if (existingProduct.deposit) {
          setForm(prev => ({
            ...prev,
            deposit: formatCurrency(existingProduct.deposit)
          }));
        }
        if (existingProduct.rentalFee) {
          setForm(prev => ({
            ...prev,
            rentalFee: formatCurrency(existingProduct.rentalFee)
          }));
        }
      }, 100);
    }
  }, [isEditMode, existingProduct, isProductLoading]);

  // Java Integer 최대값: 2,147,483,647
  const MAX_PRICE = 2147483647;

  // 입력 중에는 숫자만 허용 (포맷팅 없음)
  const handlePriceInput = (key, raw) => {
    const onlyDigits = raw.replace(/[^0-9]/g, '');
    const numValue = Number(onlyDigits) || 0;

    // 메시지 초기화 (다른 필드의 메시지는 유지)
    if (priceMessageField !== key) {
      setPriceMessage('');
      setPriceMessageType('');
      setPriceMessageField('');
    }

    // 21억 초과 시 제한
    if (numValue > MAX_PRICE) {
      const fieldName = key === 'deposit' ? '보증금' : '일일요금';
      setPriceMessage(`${fieldName}은(는) 최대 ${MAX_PRICE.toLocaleString()}원(21억)까지 입력 가능합니다.`);
      setPriceMessageType('error');
      setPriceMessageField(key);
      updateField(key, String(MAX_PRICE));
      // 3초 후 메시지 자동 제거
      setTimeout(() => {
        setPriceMessage('');
        setPriceMessageType('');
        setPriceMessageField('');
      }, 3000);
    } else {
      updateField(key, onlyDigits);
      // 정상 입력 시 메시지 제거
      if (priceMessageField === key) {
        setPriceMessage('');
        setPriceMessageType('');
        setPriceMessageField('');
      }
    }
  };

  // 포커스 잃을 때 포맷팅
  const handlePriceBlur = (key) => {
    const numValue = Number(form[key]) || 0;
    if (numValue > 0) {
      const formatted = formatCurrency(numValue);
    updateField(key, formatted);
    } else {
      updateField(key, '');
    }
  };

  // 해시태그 관리 (쉼표로 여러 개 추가 가능, 최대 3개)
  const addHashtag = () => {
    const input = hashtagInput.trim();
    if (!input) return;

    // 메시지 초기화
    setHashtagMessage('');
    setHashtagMessageType('');

    // 이미 3개 이상이면 추가 불가
    if (hashtags.length >= 3) {
      setHashtagMessage('해시태그는 최대 3개까지 추가할 수 있습니다.');
      setHashtagMessageType('error');
      setHashtagInput('');
      // 3초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 3000);
      return;
    }

    // 쉼표로 구분된 여러 해시태그 처리
    const inputTags = input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter(tag => {
        // 대소문자 구분 없이 중복 체크
        const lowerTag = tag.toLowerCase();
        return !hashtags.some(existingTag => existingTag.toLowerCase() === lowerTag);
      })
      .slice(0, 3 - hashtags.length); // 남은 개수만큼만 추가

    if (inputTags.length > 0) {
      setHashtags((prev) => [...prev, ...inputTags]);
      setHashtagMessage(`${inputTags.length}개의 해시태그가 추가되었습니다.`);
      setHashtagMessageType('success');
      // 2초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 2000);
    } else if (input.split(',').some(tag => tag.trim().length > 0)) {
      // 중복된 태그가 있는 경우
      setHashtagMessage('이미 추가된 해시태그입니다.');
      setHashtagMessageType('error');
      // 3초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 3000);
    }

    setHashtagInput('');
    // 입력창에 자동 포커스
    setTimeout(() => {
      hashtagInputRef.current?.focus();
    }, 0);
  };

  const removeHashtag = (t) => setHashtags((prev) => prev.filter((x) => x !== t));

  // 카테고리별 해시태그 조회
  const fetchCategoryHashtags = async () => {
    if (!form.categoryId) {
      alert('먼저 카테고리를 선택해주세요.');
      return;
    }
    
    // 이미 열려있으면 닫기 (토글)
    if (showHashtagRecommendations) {
      setShowHashtagRecommendations(false);
      return;
    }
    
    setLoadingHashtags(true);
    try {
      const response = await axiosInstance.get(`/hashtag/category/${form.categoryId}`);
      console.log('카테고리 해시태그 응답:', response);
      
      // 응답 구조에 따라 데이터 추출
      let hashtagData = [];
      if (response?.data?.body?.data) {
        hashtagData = response.data.body.data;
      } else if (response?.data?.data) {
        hashtagData = response.data.data;
      } else if (response?.data) {
        hashtagData = response.data;
      }
      
      // 해시태그 이름만 추출 (객체 배열인 경우)
      const hashtagNames = Array.isArray(hashtagData) 
        ? hashtagData.map(item => typeof item === 'string' ? item : item.hashtagName || item.name || item)
        : [];
      
      setRecommendedHashtags(hashtagNames);
      setShowHashtagRecommendations(true);
    } catch (err) {
      console.error('카테고리 해시태그 조회 오류:', err);
      alert(err?.response?.data?.message || '해시태그를 불러오는데 실패했습니다.');
    } finally {
      setLoadingHashtags(false);
    }
  };

  // 추천 해시태그 선택
  const addRecommendedHashtag = (tag) => {
    // 메시지 초기화
    setHashtagMessage('');
    setHashtagMessageType('');

    // 이미 3개 이상이면 추가 불가
    if (hashtags.length >= 3) {
      setHashtagMessage('해시태그는 최대 3개까지 추가할 수 있습니다.');
      setHashtagMessageType('error');
      // 3초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 3000);
      return;
    }

    // 대소문자 구분 없이 중복 체크
    const lowerTag = tag.toLowerCase();
    const isDuplicate = hashtags.some(existingTag => existingTag.toLowerCase() === lowerTag);
    
    if (!isDuplicate) {
      setHashtags((prev) => [...prev, tag]);
      setHashtagMessage(`"${tag}" 해시태그가 추가되었습니다.`);
      setHashtagMessageType('success');
      // 2초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 2000);
    } else {
      setHashtagMessage('이미 추가된 해시태그입니다.');
      setHashtagMessageType('error');
      // 3초 후 메시지 자동 제거
      setTimeout(() => {
        setHashtagMessage('');
        setHashtagMessageType('');
      }, 3000);
    }
  };

  // 추천 해시태그 영역 밖 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showHashtagRecommendations &&
        recommendedHashtagsRef.current &&
        !recommendedHashtagsRef.current.contains(event.target) &&
        hashtagButtonRef.current &&
        !hashtagButtonRef.current.contains(event.target)
      ) {
        setShowHashtagRecommendations(false);
      }
    };

    if (showHashtagRecommendations) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHashtagRecommendations]);

  // 파일 업로드 로직
  /**
   * 이미지 리사이즈 (AI 업로드용 - 용량 제한: 800KB)
   */
  const resizeImageForAI = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 최대 크기 제한 (1024px)
          const MAX_SIZE = 1024;
          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG 품질 조절 (0.7 = 70% 품질)
          canvas.toBlob((blob) => {
            if (blob.size > 800 * 1024) {
              // 여전히 800KB 초과시 품질 더 낮춤
              canvas.toBlob((blob2) => {
                resolve(new File([blob2], file.name, { type: 'image/jpeg' }));
              }, 'image/jpeg', 0.5);
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * AI로 게시글 제목과 내용 자동 생성 (GPT-4o 기반)
   */
  const generateWithAI = async (imageFile, uploadType = form.uploadType) => {
    if (!aiAvailable) {
      alert('AI 서비스를 사용할 수 없습니다.');
      return;
    }

    if (!imageFile) {
      alert('이미지를 먼저 업로드해주세요.');
      return;
    }

    try {
      setAiGenerating(true);
      console.log('[ProductCreatePage] AI 게시글 생성 시작:', imageFile.name, '업로드 타입:', uploadType);

      // 이미지 리사이즈 (용량 줄이기)
      const resizedImage = await resizeImageForAI(imageFile);
      console.log('[ProductCreatePage] 이미지 리사이즈 완료:', {
        original: (imageFile.size / 1024).toFixed(2) + 'KB',
        resized: (resizedImage.size / 1024).toFixed(2) + 'KB'
      });

      // AI API 호출 (GPT-4o: 제목, 내용, 해시태그, 카테고리, 대여료, 보증금)
      const result = await aiApi.generateProductDescription(resizedImage, uploadType);

      console.log('[ProductCreatePage] AI 게시글 생성 완료:', result);
      console.log('[ProductCreatePage] 🔍 보증금 확인:', {
        recommended_deposit: result.recommended_deposit,
        type: typeof result.recommended_deposit,
        string_value: String(result.recommended_deposit)
      });

      // 한 번에 모든 필드 업데이트 (setForm 한 번만 호출)
      // 백엔드가 항상 유효한 값을 반환하므로 프론트엔드는 신뢰
      const newFormData = {
        ...form,
        title: result.title ? result.title.slice(0, 30) : form.title,
        content: result.description ? result.description.slice(0, 2000) : form.content,
        rentalFee: result.recommended_price ? formatCurrency(result.recommended_price) : form.rentalFee,
        deposit: result.recommended_deposit ? formatCurrency(result.recommended_deposit) : form.deposit,
      };

      console.log('[ProductCreatePage] 📝 업데이트할 폼 데이터:', {
        title: newFormData.title,
        rentalFee: newFormData.rentalFee,
        deposit: newFormData.deposit,
      });

      setForm(newFormData);

      console.log('[ProductCreatePage] ✅ AI 자동 입력 완료!');

      // 해시태그 자동 입력 (최대 3개)
      if (result.hashtags && result.hashtags.length > 0) {
        // 중복 제거 및 최대 3개로 제한
        const uniqueHashtags = [];
        const lowerCaseSet = new Set();
        
        for (const tag of result.hashtags) {
          const lowerTag = tag.toLowerCase();
          if (!lowerCaseSet.has(lowerTag) && uniqueHashtags.length < 3) {
            lowerCaseSet.add(lowerTag);
            uniqueHashtags.push(tag);
          }
        }
        
        setHashtags(uniqueHashtags);
        console.log('[ProductCreatePage] ✅ AI 생성 해시태그:', uniqueHashtags);
      }

      // 카테고리 자동 선택 (카테고리 데이터가 로드된 후에만)
      console.log('[ProductCreatePage] 🔍 카테고리 로드 상태:', {
        categories_exists: !!categories,
        categories_length: categories?.length,
        isCategoriesLoading,
        sub_category: result.sub_category,
        parent_category: result.parent_category,
        categories_sample: categories?.[0]
      });

      if (categories && categories.length > 0 && (result.sub_category || result.parent_category)) {
        const categoryName = result.sub_category || result.parent_category;
        console.log('[ProductCreatePage] 📂 카테고리 검색 시작:', categoryName);

        const matchedCategory = findCategoryByName(categories, categoryName);

        if (matchedCategory) {
          updateField('categoryId', matchedCategory.categoryId);
          setSelectedCategoryName(matchedCategory.categoryName);

          // AI가 선택한 카테고리의 부모 카테고리를 activeCategoryId로 설정
          const parentCategory = categories.find(parent =>
            parent.children?.some(child => child.categoryId === matchedCategory.categoryId)
          );
          if (parentCategory) {
            setActiveCategoryId(parentCategory.categoryId);
          }

          console.log('[ProductCreatePage] ✅ AI 추천 카테고리 선택:', matchedCategory.categoryName, '(ID:', matchedCategory.categoryId, ')');
        } else {
          console.warn('[ProductCreatePage] ❌ 카테고리를 찾을 수 없음:', categoryName);
          console.warn('[ProductCreatePage] 전체 카테고리 목록:', categories.map(c => ({
            name: c.categoryName,
            children: c.children?.map(ch => ch.categoryName)
          })));
        }
      } else {
        console.warn('[ProductCreatePage] ❌ 카테고리 선택 불가 - categories가 아직 로드되지 않았거나 AI 응답에 카테고리 정보가 없음');
      }

      // 성공 메시지 표시
      setErrorMessage('');
      const priceInfo = result.recommended_price ? ` / 대여료: ${result.recommended_price.toLocaleString()}원` : '';
      const depositInfo = result.recommended_deposit ? ` / 보증금: ${result.recommended_deposit.toLocaleString()}원` : '';
      const hashtagInfo = result.hashtags?.length ? ` / 해시태그: ${result.hashtags.length}개` : '';
      const categoryInfo = result.sub_category ? ` / 카테고리: ${result.sub_category}` : '';
      const successMessage = `AI가 게시글을 자동으로 작성했습니다!`;
      setErrorMessage(successMessage);
      setTimeout(() => {
        setErrorMessage('');
      }, 1000);

    } catch (error) {
      console.error('[ProductCreatePage] AI 게시글 생성 실패:', error);
      console.warn('[ProductCreatePage] AI 자동 생성을 건너뜁니다:', error.message);
    } finally {
      setAiGenerating(false);
    }
  };

  /**
   * 카테고리 트리에서 이름으로 카테고리 찾기 (정확한 매칭만 수행)
   */
  const findCategoryByName = (tree, name) => {
    if (!tree || tree.length === 0 || !name) {
      console.warn('[ProductCreatePage] ❌ findCategoryByName: 유효하지 않은 입력', { tree: !!tree, name });
      return null;
    }

    // 정규화: 공백 제거, 소문자 변환, 특수문자 정규화
    const normalize = (str) => {
      if (!str) return '';
      return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')  // 여러 공백을 하나로
        .replace(/[·・]/g, '·');  // 중점 통일
    };

    const normalizedName = normalize(name);
    console.log('[ProductCreatePage] 🔍 카테고리 검색:', {
      original: name,
      normalized: normalizedName
    });

    // 1차: 정확한 매칭 (부모 카테고리 포함)
    for (const category of tree) {
      const normalizedCatName = normalize(category.categoryName);

      if (normalizedCatName === normalizedName) {
        console.log('[ProductCreatePage] ✅ 부모 카테고리 정확 매칭:', category.categoryName);
        return category;
      }

      // 자식 카테고리 확인
      if (category.children && category.children.length > 0) {
        for (const child of category.children) {
          const normalizedChildName = normalize(child.categoryName);

          if (normalizedChildName === normalizedName) {
            console.log('[ProductCreatePage] ✅ 자식 카테고리 정확 매칭:', child.categoryName);
            return child;
          }
        }
      }
    }

    // 2차: 부분 매칭 (자식 카테고리만, 더 구체적인 매칭)
    // AI가 반환한 이름이 카테고리 이름에 정확히 포함되어 있는지 확인
    for (const category of tree) {
      if (category.children && category.children.length > 0) {
        for (const child of category.children) {
          const normalizedChildName = normalize(child.categoryName);

          // 완전히 일치하거나, 카테고리 이름에 검색어가 정확히 포함된 경우만
          if (normalizedChildName.includes(normalizedName) && normalizedName.length >= 3) {
            console.log('[ProductCreatePage] ✅ 자식 카테고리 부분 매칭:', child.categoryName);
            return child;
          }
        }
      }
    }

    // 매칭 실패 - 경고 로깅
    console.warn('[ProductCreatePage] ⚠️ 카테고리 매칭 실패:', {
      searchName: name,
      normalized: normalizedName,
      availableCategories: tree.map(c => ({
        parent: c.categoryName,
        children: c.children?.map(ch => ch.categoryName) || []
      }))
    });

    return null;
  };

  const MAX_IMAGE_COUNT = 5;

  const handleFiles = async (files) => {
    const fileArr = Array.from(files || []);
    if (fileArr.length === 0) return;
    setErrorMessage('');

    // 이미지 개수 제한 확인 (현재 개수 + 새로 추가할 개수)
    const currentCount = filePreviews.length;
    const totalCount = currentCount + fileArr.length;
    
    if (totalCount > MAX_IMAGE_COUNT) {
      const canAdd = MAX_IMAGE_COUNT - currentCount;
      if (canAdd <= 0) {
        setErrorMessage(`이미지는 최대 ${MAX_IMAGE_COUNT}개까지 등록할 수 있습니다.`);
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      // 추가 가능한 개수만큼만 처리
      fileArr.splice(canAdd);
      setErrorMessage(`${canAdd}개의 이미지만 추가되었습니다. (최대 ${MAX_IMAGE_COUNT}개)`);
      setTimeout(() => setErrorMessage(''), 3000);
    }

    const localUrls = fileArr.map((f) => URL.createObjectURL(f));
    const previewStartIndex = filePreviews.length;
    setFilePreviews((prev) => [...prev, ...localUrls]);
    
    // 원본 파일 저장 (AI용)
    setOriginalFiles((prev) => [...prev, ...fileArr]);

    if (USE_FAKE_API) {
      const tmpIds = fileArr.map((_, i) => `tmp_${Date.now()}_${i}`);
      setFileIds((prev) => [...prev, ...tmpIds]);
      return;
    }

    setUploading(true);
    const uploadedResults = [];
    const failedIndices = [];

    try {
      const uploadPromises = fileArr.map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await axiosInstance.post(API_ENDPOINTS.FILE.BASE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          let fileId = null;
          if (res.data?.body?.data?.fileId) {
            fileId = res.data.body.data.fileId;
          } else if (res.data?.data?.fileId) {
            fileId = res.data.data.fileId;
          } else if (res.data?.fileId) {
            fileId = res.data.fileId;
          } else if (res.data?.body?.fileId) {
            fileId = res.data.body.fileId;
          }

          if (!fileId) throw new Error('fileId가 응답에 없습니다');

          uploadedResults.push({ fileId, index: previewStartIndex + index });
          return { success: true, fileId, index: previewStartIndex + index };
        } catch (fileErr) {
          failedIndices.push(previewStartIndex + index);
          return { success: false, index: previewStartIndex + index };
        }
      });

      await Promise.all(uploadPromises);

      const successfulUploads = uploadedResults.filter(r => r.fileId !== undefined && r.fileId !== null);
      if (successfulUploads.length > 0) {
        setFileIds((prev) => [...prev, ...successfulUploads.map(r => r.fileId)]);
      }

      if (failedIndices.length > 0) {
        setFilePreviews((prev) => {
          const newPreviews = [...prev];
          failedIndices.reverse().forEach(idx => {
            if (idx < newPreviews.length) {
              const url = newPreviews[idx];
              if (url?.startsWith('blob:')) {
                try { URL.revokeObjectURL(url); } catch {}
              }
              newPreviews.splice(idx, 1);
            }
          });
          return newPreviews;
        });
        
        // 원본 파일도 함께 삭제
        setOriginalFiles((prev) => {
          const newFiles = [...prev];
          failedIndices.reverse().forEach(idx => {
            if (idx < newFiles.length) {
              newFiles.splice(idx, 1);
            }
          });
          return newFiles;
        });

        if (successfulUploads.length === 0) {
          setErrorMessage('이미지 업로드에 실패했습니다.');
        } else {
          setErrorMessage(`${failedIndices.length}개의 이미지 업로드에 실패했습니다.`);
        }
      }
    } catch (err) {
      console.error('파일 업로드 오류:', err);
      setFilePreviews((prev) => {
        const newPreviews = [...prev];
        localUrls.forEach(url => {
          if (url?.startsWith('blob:')) {
            try { URL.revokeObjectURL(url); } catch {}
          }
        });
        return newPreviews.slice(0, previewStartIndex);
      });
      setErrorMessage(err?.response?.data?.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (filePreviews.length < MAX_IMAGE_COUNT) {
      handleFiles(e.dataTransfer.files);
    } else {
      setErrorMessage(`이미지는 최대 ${MAX_IMAGE_COUNT}개까지 등록할 수 있습니다.`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const removeImageAt = (idx) => {
    setFileIds((prev) => {
      const newIds = [...prev];
      if (idx < newIds.length) newIds.splice(idx, 1);
      return newIds;
    });
    setFilePreviews((prev) => {
      const newPreviews = [...prev];
      if (idx < newPreviews.length) {
        const toRemove = newPreviews[idx];
        if (toRemove?.startsWith('blob:')) {
          try { URL.revokeObjectURL(toRemove); } catch {}
        }
        newPreviews.splice(idx, 1);
      }
      return newPreviews;
    });
    // 원본 파일도 함께 삭제
    setOriginalFiles((prev) => {
      const newFiles = [...prev];
      if (idx < newFiles.length) {
        newFiles.splice(idx, 1);
      }
      return newFiles;
    });
  };

  const onThumbDragStart = (index) => (e) => {
    dragItemIndex.current = index;
  };

  const onThumbDrop = (index) => (e) => {
    e.preventDefault();
    const from = dragItemIndex.current;
    if (from === null || from === index) return;
    setFileIds((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    setFilePreviews((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    // 원본 파일도 함께 순서 변경
    setOriginalFiles((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    dragItemIndex.current = null;
  };

  // 캘린더 유틸
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  // 오늘 이전 날짜인지 확인
  const isPastDate = (d) => {
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return date < today;
  };
  const isDateSelected = (d) => sameDay(d, calStart) || sameDay(d, calEnd);
  const isPendingRange = (d) => {
    if (!calStart || !d) return false;
    if (calEnd) {
      return d >= calStart && d <= calEnd;
    }
    // 종료일이 없으면 시작일만 표시
    return sameDay(d, calStart);
  };
  const isInAvailableRange = (d) => {
    if (!d || !form.startRent) return false;
    const s = new Date(form.startRent);
    const e = form.endRent === '' || !form.endRent ? null : new Date(form.endRent);
    if (!e) return sameDay(d, s) || d >= s;
    return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && 
           d <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
  };
  const isInRefuseRanges = (d) => {
    if (!d || rentalRefs.length === 0) return false;
    return rentalRefs.some((r) => {
      const rs = new Date(r.startRef);
      const re = new Date(r.endRef);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const rsDay = new Date(rs.getFullYear(), rs.getMonth(), rs.getDate());
      const reDay = new Date(re.getFullYear(), re.getMonth(), re.getDate());
      return day >= rsDay && day <= reDay;
    });
  };

  const shiftMonth = (delta) => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  // 달력 클릭 로직: 첫 클릭 -> 시작일, 두 번째 클릭 -> 종료일, 중복 클릭 -> 취소
  const onCalendarClick = (date) => {
    if (!date) return;

    // 오늘 이전 날짜는 선택 불가
    if (isPastDate(date)) {
      return;
    }

    // 가능 기간 모드: 이미 설정된 가능 기간 내의 날짜를 클릭하면 초기화
    if (calendarMode === 'available') {
      const isInRange = isInAvailableRange(date);
      if (isInRange && calClickState === 'none') {
        // 이미 설정된 가능 기간을 클릭한 경우 → 초기화
        setCalStart(null);
        setCalEnd(null);
        setCalClickState('none');
        updateField('startRent', '');
        updateField('endRent', '');
        return;
      }

      if (calClickState === 'none') {
        // 첫 클릭: 시작일 설정
        setCalStart(date);
        setCalEnd(null);
        setCalClickState('start');
      } else if (calClickState === 'start') {
        // 두 번째 클릭: 종료일 설정 (최소 1일 차이 필요)
        const nextDay = new Date(calStart);
        nextDay.setDate(calStart.getDate() + 1);
        
        if (date >= nextDay) {
          // 시작일 다음 날 이후인 경우에만 종료일로 설정
          setCalEnd(date);
          setCalClickState('end');
          // 자동 적용
          setTimeout(() => {
            updateField('startRent', new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString().slice(0,16));
            if (noEndDate) {
              updateField('endRent', '');
            } else {
              updateField('endRent', new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16));
            }
          }, 0);
        } else {
          // 같은 날짜 또는 이전 날짜 선택 시 시작일을 새로 설정
          setCalStart(date);
          setCalEnd(null);
          setCalClickState('start');
        }
      } else if (calClickState === 'end') {
        // 세 번째 클릭: 초기화하고 새로 시작
        setCalStart(null);
        setCalEnd(null);
        setCalClickState('none');
        updateField('startRent', '');
        updateField('endRent', '');
      }
      return;
    }

    // 불가 기간 모드: 하루씩 개별 선택
    // 빌려요 모드에서는 불가 기간 설정 불가
    if (calendarMode === 'refuse') {
      if (form.uploadType === 'BORROW') {
        // 빌려요 모드에서는 불가 기간 모드로 전환 불가
        setCalendarMode('available');
        return;
      }
      // 가능 기간이 설정되어 있을 때, 가능 기간 범위 내에서만 선택 가능
      if (form.startRent) {
        const startRentDate = new Date(form.startRent);
        const endRentDate = form.endRent && form.endRent !== '' ? new Date(form.endRent) : null;
        const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const startDate = new Date(startRentDate.getFullYear(), startRentDate.getMonth(), startRentDate.getDate());
        
        if (endRentDate) {
          const endDate = new Date(endRentDate.getFullYear(), endRentDate.getMonth(), endRentDate.getDate());
          if (clickedDate < startDate || clickedDate > endDate) {
            // 가능 기간 범위 밖이면 선택 불가
            return;
          }
        } else {
          // 종료일이 없으면 시작일 이후만 가능
          if (clickedDate < startDate) {
            return;
          }
        }
      }

      // 이미 설정된 불가 기간의 날짜를 클릭하면 해당 날짜만 삭제
      const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const clickedInRefuseRange = rentalRefs.findIndex((r) => {
        const rs = new Date(r.startRef);
        const re = new Date(r.endRef);
        const rsDay = new Date(rs.getFullYear(), rs.getMonth(), rs.getDate());
        const reDay = new Date(re.getFullYear(), re.getMonth(), re.getDate());
        return clickedDate >= rsDay && clickedDate <= reDay;
      });

      if (clickedInRefuseRange !== -1) {
        // 이미 설정된 불가 기간을 클릭한 경우 → 해당 날짜만 삭제
        setRentalRefs((prev) => prev.filter((_, idx) => idx !== clickedInRefuseRange));
        return;
      }

      // 새로운 불가 날짜 추가 (하루만)
      const dateIso = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString();
      setRentalRefs((prev) => [...prev, { startRef: dateIso, endRef: dateIso }]);
    }
  };

  // 단계별 유효성 검사
  const canGoNext = useMemo(() => {
    // AI 처리 중일 때는 다음 버튼 비활성화
    if (aiGenerating) return false;

    switch (currentStep) {
      case 1:
        // 1단계: 이미지
        return fileIds.length > 0;
      case 2:
        // 2단계: 기본 정보 (업로드타입, 대여방법, 카테고리만)
        return form.categoryId;
      case 3:
        // 3단계: 상품 설명 (제목, 내용, 보증금, 일일요금)
        return form.title && form.content && parseNumber(form.deposit) > 0 && parseNumber(form.rentalFee) > 0;
      case 4:
        // 4단계: 지역
        return form.sidoId && form.gunguId && form.dongId;
      case 5:
        // 5단계: 날짜
        // 빌려요 모드일 때는 종료일 필수
        if (form.uploadType === 'BORROW') {
          return form.startRent && form.endRent && form.endRent !== '';
        }
        // 빌려드려요 모드일 때는 기존 로직 유지
        return form.startRent && (noEndDate || form.endRent || form.endRent === '');
      case 6:
        // 6단계: 완료
        return true;
      default:
        return false;
    }
  }, [currentStep, form, fileIds, noEndDate, aiGenerating]);

  const handleNext = () => {
    if (canGoNext && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      setErrorMessage('');
      // 우측 영역 스크롤을 맨 위로 이동
      if (rightFormRef.current) {
        rightFormRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrorMessage('');
    }
  };

  const buildPayload = () => ({
    uploadType: form.uploadType,
    title: form.title,
    content: form.content,
    deposit: parseNumber(form.deposit),
    rentalFee: parseNumber(form.rentalFee),
    rentMethod: form.rentMethod,
    videoNecessary: Boolean(form.videoNecessary),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    sidoId: form.sidoId ? Number(form.sidoId) : null,
    gunguId: form.gunguId ? Number(form.gunguId) : null,
    dongId: form.dongId ? Number(form.dongId) : null,
    startRent: form.startRent ? new Date(form.startRent).toISOString() : null,
    endRent: form.endRent ? new Date(form.endRent).toISOString() : null,
    fileIds,
    hashtags,
    rentalRefuses: rentalRefs,  // 백엔드 API 명세에 맞춰 rentalRefuses로 변경
  });

  const handleSubmit = async () => {
    setErrorMessage('');
    setSubmitting(true);
    try {
      const payload = buildPayload();
      console.log('📦 전송 데이터:', JSON.stringify(payload, null, 2));
      
      if (USE_FAKE_API) {
        navigate(ROUTE_PATHS.PRODUCT_DETAIL(String(isEditMode ? productId : Date.now())));
        return;
      }
      
      let res;
      if (isEditMode) {
        // 수정 모드: PATCH API 호출
        console.log('[ProductCreatePage] 상품 수정 요청:', { productId, payload });
        res = await productApi.updateProduct(productId, payload);
        console.log('[ProductCreatePage] 상품 수정 성공:', res);
      } else {
        // 생성 모드: POST API 호출
        res = await axiosInstance.post('/products', payload);
      }
      
      let productIdResult = productId; // 수정 모드면 기존 productId 사용
      
      if (!isEditMode && res) {
        // 생성 모드일 때만 productId 추출
        console.log('📥 응답 전체:', res);
        console.log('📥 res.data:', res.data);
        console.log('📥 res.data.data:', res.data?.data);
        console.log('📥 res.data.body:', res.data?.body);
        
        if (typeof res === 'number') {
          productIdResult = res;
        } else if (typeof res.data === 'number') {
          productIdResult = res.data;
        } else if (typeof res.data?.data === 'number') {
          productIdResult = res.data.data;
        } else if (typeof res.data?.body?.data === 'number') {
          productIdResult = res.data.body.data;
        } else if (typeof res.productId === 'number') {
          productIdResult = res.productId;
        } else if (typeof res.data?.productId === 'number') {
          productIdResult = res.data.productId;
        } else {
          console.error('⚠️ productId를 추출할 수 없습니다. 응답 구조:', res);
        }
      }
      
      console.log('🎯 최종 productIdResult:', productIdResult, typeof productIdResult);
      
      if (productIdResult && typeof productIdResult === 'number') {
        // 생성 모드일 때는 fromCreate state를 전달하여 상세페이지에서 뒤로가기 시 마이페이지로 이동
        navigate(ROUTE_PATHS.PRODUCT_DETAIL(String(productIdResult)), {
          state: isEditMode ? undefined : { fromCreate: true }
        });
      } else {
        setErrorMessage(isEditMode 
          ? '상품 수정은 성공했지만 상품 ID를 가져올 수 없습니다.'
          : '상품 등록은 성공했지만 상품 ID를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('❌ 에러:', err);
      console.error('📋 에러 응답:', err?.response?.data);
      
      setErrorMessage(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (isEditMode ? '상품 수정 중 오류가 발생했습니다.' : '상품 등록 중 오류가 발생했습니다.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const monthLabel = calendarMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  // 미리보기용 상품 데이터
  const previewProduct = useMemo(() => ({
    images: filePreviews.length > 0 ? filePreviews : ['https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=No+Image'],
    title: form.title || '상품명을 입력하세요',
    description: form.content || '상품 설명을 입력하세요',
    hashtags: hashtags,
    price: parseNumber(form.rentalFee),
    deposit: parseNumber(form.deposit),
    seller: {
      nickname: user?.nickname || '판매자',
      profileImage: user?.profileImageUrl,
      rating: 0,
      reviewCount: 0,
    },
  }), [filePreviews, form, hashtags, user]);

  // Step - 기본 정보 (업로드 타입, 대여 방법, 카테고리만)
  const renderStepBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black mb-2">기본 정보</h2>
        <p className="text-gray-600">상품의 기본 정보를 선택해주세요</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">업로드 타입</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => updateField('uploadType', form.uploadType === 'RENT' ? 'BORROW' : 'RENT')}
                className="relative w-full h-12 rounded-lg p-1 transition-all duration-300 bg-gray-200"
              >
                {/* 슬라이더 */}
                <div
                  className="absolute top-1 h-10 w-[calc(50%-4px)] rounded-md shadow-md transition-all duration-300 flex items-center justify-center bg-gray-900"
                  style={{
                    left: form.uploadType === 'RENT' ? '4px' : 'calc(50% + 0px)'
                  }}
                />
                
                {/* 텍스트 레이어 */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <div className="w-1/2 flex items-center justify-center">
                    <span className={`text-sm font-bold transition-colors duration-300 ${form.uploadType === 'RENT' ? 'text-white' : 'text-gray-600'}`}>
                      빌려드려요
                    </span>
                  </div>
                  <div className="w-1/2 flex items-center justify-center">
                    <span className={`text-sm font-bold transition-colors duration-300 ${form.uploadType === 'BORROW' ? 'text-white' : 'text-gray-600'}`}>
                      빌려요
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">대여 방법</label>
            <div className="relative">
              <div className="relative w-full h-12 rounded-lg p-1 bg-gray-200">
                {/* 슬라이더 */}
                <div
                  className="absolute top-1 h-10 rounded-md shadow-md transition-all duration-300 flex items-center justify-center bg-gray-900"
                  style={{
                    width: 'calc(33.33% - 5.33px)',
                    left: form.rentMethod === 'BOTH' 
                      ? '4px' 
                      : form.rentMethod === 'ONLY_OFFLINE'
                      ? 'calc(33.33% + 1.33px)'
                      : 'calc(66.66% - 1.33px)'
                  }}
                />
                
                {/* 텍스트 레이어 */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  {enumRentMethods.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => updateField('rentMethod', m.value)}
                      className="w-1/3 flex items-center justify-center pointer-events-auto"
                    >
                      <span className={`text-xs font-bold transition-colors duration-300 ${form.rentMethod === m.value ? 'text-white' : 'text-gray-600'}`}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리 선택 */}
          <div className="category-popover-container">
            <label className="block text-sm font-medium text-black mb-1.5">카테고리</label>
            <button
              type="button"
              onClick={() => {
                // 모달 열 때 현재 선택된 카테고리의 부모 카테고리를 activeCategoryId로 설정
                if (form.categoryId) {
                  const parentCategory = categories.find(parent =>
                    parent.children?.some(child => child.categoryId === form.categoryId)
                  );
                  if (parentCategory) {
                    setActiveCategoryId(parentCategory.categoryId);
                  }
                }
                setShowCategoryPopover(!showCategoryPopover);
              }}
              className="w-full px-4 py-3 text-left text-sm bg-white border-2 border-gray-300 rounded-xl text-black hover:border-black transition-colors overflow-hidden whitespace-nowrap text-ellipsis"
            >
              {selectedCategoryName || '카테고리를 선택하세요'}
            </button>
          </div>
        </div>
    </div>
  );

  // Step - 상품 설명 (제목, 해시태그, 내용, 보증금, 일일요금)
  const renderStepDescription = () => (
    <div className="space-y-4">
      {/* 헤더 + 보증금/일일요금 - 모바일에서는 세로, 데스크톱에서는 가로 */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* 왼쪽: 헤더 */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-black mb-2">상품 설명</h2>
          <p className="text-gray-600">상품의 상세 정보를 입력해주세요</p>
        </div>

        {/* 오른쪽: 보증금 + 일일요금 (모바일에서는 세로, 데스크톱에서는 가로 배치) */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-40">
            <label className="block text-sm font-medium text-black mb-1">보증금</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.deposit}
              onChange={(e) => handlePriceInput('deposit', e.target.value)}
              onBlur={() => handlePriceBlur('deposit')}
              placeholder="300000"
              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
            />
            {/* 보증금 메시지 */}
            {priceMessage && priceMessageField === 'deposit' && (
              <div className={`mt-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs transition-all duration-300 ${
                priceMessageType === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium flex-1">{priceMessage}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPriceMessage('');
                    setPriceMessageType('');
                    setPriceMessageField('');
                  }}
                  className="text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="w-full md:w-40">
            <label className="block text-sm font-medium text-black mb-1">일일요금</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.rentalFee}
              onChange={(e) => handlePriceInput('rentalFee', e.target.value)}
              onBlur={() => handlePriceBlur('rentalFee')}
              placeholder="35000"
              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
            />
            {/* 일일요금 메시지 */}
            {priceMessage && priceMessageField === 'rentalFee' && (
              <div className={`mt-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs transition-all duration-300 ${
                priceMessageType === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium flex-1">{priceMessage}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPriceMessage('');
                    setPriceMessageType('');
                    setPriceMessageField('');
                  }}
                  className="text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI 자동 작성 버튼 - 독립된 공간 */}
      {aiAvailable && originalFiles.length > 0 && (
        <div className="max-w-4xl mx-auto py-2">
          <button
            type="button"
            onClick={async () => {
              if (originalFiles.length > 0) {
                await generateWithAI(originalFiles[0], form.uploadType);
              } else {
                alert('이미지를 먼저 업로드해주세요.');
              }
            }}
            disabled={aiGenerating}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {aiGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                AI 작성 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI 자동 작성
              </>
            )}
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-3">
          {/* 제목 - 전체 너비 */}
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">제목</label>
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value.slice(0, 30))}
              placeholder="상품 제목을 입력하세요"
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
            />
            <div className="text-right text-xs mt-1">
              <span className={form.title.length >= 25 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                {form.title.length}/30
              </span>
              {form.title.length === 30 && (
                <span className="ml-2 text-red-600 text-xs">최대 길이입니다</span>
              )}
            </div>
          </div>

          {/* 해시태그 (전체 너비) */}
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">
              해시태그 (최대 3개, 쉼표로 여러 개 추가 가능)
              <span className="ml-2 text-xs text-gray-500">({hashtags.length}/3)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1 flex items-center border-2 border-gray-300 rounded-lg focus-within:border-black transition-colors bg-white overflow-hidden">
                {/* 입력창 */}
                <input
                  ref={hashtagInputRef}
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                  placeholder="예: 카메라, 렌즈, 삼각대"
                  className="flex-1 px-3 py-2 bg-transparent text-sm text-black placeholder-gray-500 focus:outline-none"
                />

                {/* 추가 버튼 */}
                <button
                  type="button"
                  onClick={addHashtag}
                  disabled={hashtags.length >= 3}
                  className="w-10 h-10 flex items-center justify-center bg-black text-white text-xl font-bold hover:bg-gray-800 transition-colors flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title={hashtags.length >= 3 ? '해시태그는 최대 3개까지 추가할 수 있습니다' : '해시태그 추가'}
                >
                  +
                </button>
              </div>

              {/* 관련 해시태그 조회 버튼 */}
              <button
                ref={hashtagButtonRef}
                type="button"
                onClick={fetchCategoryHashtags}
                disabled={loadingHashtags || !form.categoryId}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
                title={!form.categoryId ? '카테고리를 먼저 선택해주세요' : '카테고리별 추천 해시태그 조회'}
              >
                추천 해시태그
              </button>
            </div>
            
            {/* 해시태그 메시지 */}
            {hashtagMessage && (
              <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
                hashtagMessageType === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : hashtagMessageType === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                {hashtagMessageType === 'error' && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {hashtagMessageType === 'success' && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-xs font-medium flex-1">{hashtagMessage}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHashtagMessage('');
                    setHashtagMessageType('');
                  }}
                  className="text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* 추천 해시태그 목록 */}
            {showHashtagRecommendations && recommendedHashtags.length > 0 && (
              <div ref={recommendedHashtagsRef} className="mt-2 p-3 bg-gray-50 border-2 border-gray-300 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">추천 해시태그</span>
                  <button
                    type="button"
                    onClick={() => setShowHashtagRecommendations(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedHashtags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addRecommendedHashtag(tag)}
                      disabled={
                        hashtags.length >= 3 || 
                        hashtags.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        hashtags.length >= 3 || 
                        hashtags.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 모바일용 해시태그 표시 (데스크톱에서는 미리보기에 표시) */}
            {hashtags.length > 0 && (
              <div className="lg:hidden mt-2 flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-900 text-white"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 내용 - 전체 너비 */}
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => updateField('content', e.target.value.slice(0, 255))}
              rows={3}
              placeholder="상세 내용을 입력하세요"
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black resize-none"
            />
            <div className="text-right text-xs text-gray-500">{form.content.length}/255</div>
          </div>
        </div>
      </div>
    );

  // Step 2: 이미지 업로드
  const renderStep2 = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black mb-1">이미지 업로드</h2>
          <p className="text-gray-600 text-sm">상품 이미지를 업로드해주세요 (첫 번째 이미지가 대표 이미지입니다)</p>
        </div>
      </div>

      {/* 드래그 영역과 미리보기를 가로로 배치 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 왼쪽: 드래그 영역 (정사각형) */}
        <div className="flex-shrink-0">
          <div
            ref={dndZoneRef}
            onDrop={onDrop}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onClick={() => { if (!uploading && !aiGenerating && filePreviews.length < MAX_IMAGE_COUNT) fileInputRef.current?.click(); }}
            className={`w-full lg:w-80 aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
              filePreviews.length >= MAX_IMAGE_COUNT || uploading || aiGenerating
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                : dragActive
                ? 'border-black bg-gray-100 scale-105 cursor-pointer'
                : 'border-gray-300 hover:border-black bg-gray-50 cursor-pointer'
            }`}
          >
            <FiUpload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-black font-medium mb-1 text-center px-4 text-sm">여기로 드래그 또는 클릭하여 이미지 추가</p>
            <p className="text-gray-600 text-xs text-center px-4">여러 이미지를 한번에 업로드할 수 있습니다 (최대 {MAX_IMAGE_COUNT}개)</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" disabled={uploading || aiGenerating || filePreviews.length >= MAX_IMAGE_COUNT} />
            {uploading && <p className="text-gray-600 text-xs mt-2">업로드 중...</p>}
          </div>
        </div>

        {/* 오른쪽: 미리보기 그리드 */}
        {filePreviews.length > 0 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '320px' }}>
              <div className="grid grid-cols-4 gap-2">
                {filePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative group"
                    draggable
                    onDragStart={onThumbDragStart(idx)}
                    onDrop={onThumbDrop(idx)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                      <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          대표
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      className="absolute top-1 right-1 bg-black/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="hidden lg:block text-gray-600 text-xs mt-2">💡 이미지를 드래그하여 순서를 변경할 수 있습니다</p>
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: 지역 선택
  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black mb-1">지역 선택</h2>
        <p className="text-gray-600 text-sm">상품의 거래 지역을 선택해주세요</p>
      </div>

      <div>
        {/* 지역 */}
        <div>
          <label className="block text-sm font-medium text-black mb-1.5">지역</label>
          <button
            type="button"
            onClick={() => setShowRegionPopover(!showRegionPopover)}
            className="w-full px-4 py-3 text-left text-sm bg-white border-2 border-gray-300 rounded-xl text-black hover:border-black transition-colors overflow-hidden whitespace-nowrap text-ellipsis"
          >
            {selectedRegionName || '지역을 선택하세요'}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 4: 날짜 설정
  const renderStep4 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black mb-1">
          {form.uploadType === 'BORROW' ? '대여 희망 기간' : '대여 가능 기간'}
        </h2>
        <p className="text-gray-600 text-sm">
          {form.uploadType === 'BORROW' 
            ? '빌리고 싶은 기간을 설정해주세요' 
            : '대여 가능한 기간과 불가 기간을 설정해주세요'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 왼쪽: 캘린더 */}
        <div className="lg:w-1/2">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 text-black hover:bg-gray-100 rounded-lg">
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-black font-semibold text-sm">{monthLabel}</div>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 text-black hover:bg-gray-100 rounded-lg">
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-2">
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className="h-8 flex items-center justify-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarMonth).map((d, idx) => {
              const selected = isDateSelected(d) || isPendingRange(d);
              const inAvailable = isInAvailableRange(d);
              const inRefuse = isInRefuseRanges(d);
              const isPast = isPastDate(d);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!d || isPast}
                  onClick={() => d && onCalendarClick(d)}
                  className={`h-8 w-full aspect-square rounded-lg text-xs transition-all ${
                    !d ? 'invisible' :
                    isPast ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                    inRefuse ? 'bg-red-500 text-white' :
                    selected || inAvailable ? 'bg-black text-white font-bold' :
                    'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d && d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {calendarMode === 'available' && (
              <>
                {calClickState === 'start' && '시작일을 선택하세요'}
                {calClickState === 'end' && '종료일을 선택하세요 (다음 클릭 시 초기화)'}
                {calClickState === 'none' && '날짜를 선택하세요'}
              </>
            )}
            {calendarMode === 'refuse' && '불가 날짜를 클릭하여 추가하거나 삭제하세요'}
          </div>
        </div>

        {/* 오른쪽: 설정 패널 (스크롤 적용) */}
        <div className="lg:w-1/2 flex flex-col" style={{ maxHeight: '320px' }}>
          <div
            className="space-y-4 overflow-y-auto scrollbar-hide pr-2 pb-2"
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCalendarMode('available');
                  setCalStart(null);
                  setCalEnd(null);
                  setCalClickState('none');
                }}
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all border-2 ${
                  calendarMode === 'available'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black'
                }`}
              >
                {form.uploadType === 'BORROW' ? '희망 기간' : '가능 기간'}
              </button>
              {form.uploadType === 'RENT' && (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('refuse');
                    setCalStart(null);
                    setCalEnd(null);
                    setCalClickState('none');
                  }}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all border-2 ${
                    calendarMode === 'refuse'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-black border-gray-300 hover:border-red-500'
                  }`}
                >
                  불가 기간
                </button>
              )}
            </div>

            {calendarMode === 'available' && (
              <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl">
                {/* 빌려요 모드일 때는 종료일 없음 옵션 비활성화 */}
                {form.uploadType === 'RENT' && (
                  <label className="flex items-center gap-2 text-black mb-3">
                    <input
                      type="checkbox"
                      checked={noEndDate}
                      onChange={(e) => setNoEndDate(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">종료일 없음</span>
                  </label>
                )}
                {form.uploadType === 'BORROW' && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-300 rounded-lg">
                    <p className="text-xs text-blue-900">💡 빌려요 모드에서는 빌리고 싶은 기간을 명확히 입력해주세요</p>
                  </div>
                )}
                <div className="space-y-2 text-sm text-gray-700">
                  <div>시작: {form.startRent ? new Date(form.startRent).toLocaleDateString('ko-KR') : '-'}</div>
                  <div>종료: {form.endRent === '' ? '종료일 없음' : (form.endRent ? new Date(form.endRent).toLocaleDateString('ko-KR') : '-')}</div>
                </div>
              </div>
            )}

            {calendarMode === 'refuse' && form.uploadType === 'RENT' && rentalRefs.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-black mb-2">불가 날짜 목록</div>
                {rentalRefs.map((r, i) => {
                  const startDate = new Date(r.startRef).toLocaleDateString('ko-KR');
                  const endDate = new Date(r.endRef).toLocaleDateString('ko-KR');
                  const isSameDay = startDate === endDate;

                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-300 rounded-xl">
                      <span className="text-sm text-black">
                        {isSameDay ? startDate : `${startDate} ~ ${endDate}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRentalRefs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCalStart(null);
                setCalEnd(null);
                setNoEndDate(false);
                setCalClickState('none');
                updateField('startRent', '');
                updateField('endRent', '');
                setRentalRefs([]);
              }}
              className="w-full px-4 py-2 bg-white text-black border-2 border-gray-300 rounded-xl hover:border-black transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 5: 최종 확인
  const renderStep5 = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-400px)]">
      <div className="text-center space-y-6 max-w-md px-4">
        {/* Lottie 애니메이션 */}
        <div className="flex justify-center">
          <Lottie
            animationData={celebrationAnimation}
            loop={true}
            autoplay={true}
            style={{ width: 200, height: 200 }}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-black">모든 설정이 완료되었습니다</h2>
          <p className="text-lg text-gray-700">지금 보이는 내용으로 바로 등록할까요?</p>
        </div>

        <div className="pt-4">
          <p className="hidden lg:block text-sm text-gray-500">← 왼쪽 미리보기에서 입력하신 정보를 확인해주세요</p>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep2(); // 이미지를 가장 먼저
      case 2: return renderStepBasicInfo(); // 기본 정보
      case 3: return renderStepDescription(); // 상품 설명
      case 4: return renderStep3(); // 지역
      case 5: return renderStep4(); // 날짜
      case 6: return renderStep5(); // 완료
      default: return renderStep2();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black">
              {isEditMode ? '상품 수정' : '상품 등록'}
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* 수정 모드일 때 상품 정보 로딩 중 */}
      {isEditMode && isProductLoading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <div className="text-gray-600">상품 정보를 불러오는 중...</div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 - 좌우 레이아웃 */}
      {(!isEditMode || !isProductLoading) && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-auto lg:h-[calc(100vh-64px-56px)] lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 좌측: 미리보기 (모바일에서 숨김) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="bg-white border-2 border-gray-300 rounded-2xl p-3 shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
              <div className="space-y-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: '100%', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <ImageGallery
                  key={filePreviews.length > 0 ? filePreviews[0] : 'no-image'}
                  images={previewProduct.images}
                  productTitle={previewProduct.title}
                  isLiked={false}
                  compact
                />
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-900 text-white">
                    {enumUploadTypes.find(u=>u.value===form.uploadType)?.label || '타입'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-300 text-gray-900">
                    {enumRentMethods.find(r=>r.value===form.rentMethod)?.label || '대여 방법'}
                  </span>
                </div>
                <ProductInfo
                  title={previewProduct.title}
                  hashtags={previewProduct.hashtags}
                  description={previewProduct.description}
                  compact
                  onRemoveHashtag={removeHashtag}
                />

                <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">일일 대여료</span>
                    <span className="text-sm font-bold text-black">{previewProduct.price.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">보증금</span>
                    <span className="text-sm font-medium text-black">{previewProduct.deposit.toLocaleString()}원</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                    <div className="text-[12px] text-gray-600 mb-1">카테고리</div>
                    <div className="text-xs text-black font-medium">{selectedCategoryName || '-'}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                    <div className="text-[12px] text-gray-600 mb-1">지역</div>
                    <div className="text-xs text-black font-medium">{selectedRegionName || (form.sidoId && form.gunguId && form.dongId ? `${form.sidoId} ${form.gunguId} ${form.dongId}` : '-')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                    <div className="text-[12px] text-gray-600 mb-1">대여 시작</div>
                    <div className="text-xs text-black font-medium">{form.startRent ? new Date(form.startRent).toLocaleDateString('ko-KR') : '-'}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                    <div className="text-[12px] text-gray-600 mb-1">대여 종료</div>
                    <div className="text-xs text-black font-medium">{form.endRent === '' ? '종료일 없음' : (form.endRent ? new Date(form.endRent).toLocaleDateString('ko-KR') : '-')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 입력 폼 (모바일에서 전체 너비) */}
          <div className="lg:col-span-8 flex flex-col">
            {/* 스크롤 가능한 콘텐츠 영역 */}
            <div
              ref={rightFormRef}
              className={`flex-1 scrollbar-hide overflow-y-auto pb-12 lg:pb-4 ${currentStep === 4 ? 'lg:overflow-hidden' : ''}`}
              style={{
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                maxHeight: 'calc(100vh - 200px)'
              }}
            >
              {errorMessage && (
                <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2 ${
                  errorMessage.includes('성공') || errorMessage.includes('작성했습니다')
                    ? 'bg-gray-900 border-2 border-gray-800 text-white'
                    : 'bg-gray-900 border-2 border-gray-800 text-white'
                }`}>
                  {errorMessage.includes('성공') || errorMessage.includes('작성했습니다') ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                {renderCurrentStep()}
              </div>
            </div>

            {/* 네비게이션 버튼 - 모바일: 진행도 바 위 고정, PC: 폼 하단에 자연스럽게 배치 */}
            <div className="fixed lg:static bottom-20 sm:bottom-24 lg:bottom-auto left-0 right-0 lg:left-auto lg:right-auto flex-shrink-0 bg-white py-3 border-t-2 border-gray-300 z-30 lg:z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:px-0">
                <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all border-2 ${
                    currentStep === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-black border-gray-300 hover:border-black'
                  }`}
                >
                  <FiChevronLeft className="w-5 h-5" />
                  이전
                </button>

                {currentStep < TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
                      canGoNext
                        ? 'bg-black text-white border-black hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    다음
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !canGoNext}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
                      !submitting && canGoNext
                        ? 'bg-black text-white border-black hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {submitting
                      ? (isEditMode ? '수정 중...' : '등록 중...')
                      : (isEditMode ? '상품 수정' : '상품 등록')}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 하단 진행도 - 항상 표시 */}
      {(!isEditMode || !isProductLoading) && (
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-1.5 sm:py-2">
          <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 lg:gap-6">
            {STEP_NAMES.map((name, index) => (
              <React.Fragment key={index}>
                {/* 단계 원형 및 이름 */}
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mb-1 border-2 transition-all ${
                    index + 1 < currentStep
                      ? 'bg-black text-white border-black'
                      : index + 1 === currentStep
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}>
                    {index + 1 < currentStep ? '✓' : index + 1}
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${
                    index + 1 <= currentStep ? 'text-black' : 'text-gray-400'
                  }`}>
                    {name}
                  </span>
                </div>

                {/* 연결선 */}
                {index < STEP_NAMES.length - 1 && (
                  <div className={`h-0.5 w-4 sm:w-8 md:w-16 lg:w-24 flex-shrink-0 mb-5 transition-all ${
                    index + 1 < currentStep ? 'bg-black' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* 카테고리 선택 모달 */}
      {showCategoryPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center category-popover-container animate-fadeIn">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowCategoryPopover(false)}
          />

          {/* 모달 콘텐츠 */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slideUp">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">카테고리 선택</h3>
              <button
                type="button"
                onClick={() => setShowCategoryPopover(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 카테고리 선택 영역 */}
            <div className="flex" style={{ height: '320px' }}>
              {/* 상위 카테고리 */}
              <div className="w-1/2 overflow-y-auto scrollbar-hide border-r border-gray-200">
                {isCategoriesLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">로딩 중...</div>
                ) : categories.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">카테고리가 없습니다</div>
                ) : (
                  categories.map(category => (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => setActiveCategoryId(category.categoryId)}
                      className={`w-full text-left py-2.5 px-3 text-sm transition-all ${
                        activeCategoryId === category.categoryId
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {category.categoryName}
                    </button>
                  ))
                )}
              </div>

              {/* 하위 카테고리 */}
              <div className="w-1/2 overflow-y-auto scrollbar-hide p-2">
                {categories.find(c => c.categoryId === activeCategoryId)?.children?.map((sub) => (
                  <button
                    key={sub.categoryId}
                    type="button"
                    onClick={() => {
                      updateField('categoryId', sub.categoryId);
                      setSelectedCategoryName(sub.categoryName);
                      setShowCategoryPopover(false);
                    }}
                    className={`w-full text-left py-2 px-2.5 rounded text-sm transition-all mb-1 ${
                      form.categoryId === sub.categoryId
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {sub.categoryName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 지역 선택 모달 */}
      {showRegionPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center category-popover-container animate-fadeIn">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowRegionPopover(false)}
          />

          {/* 모달 콘텐츠 */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-slideUp">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">지역 선택</h3>
              <button
                type="button"
                onClick={() => setShowRegionPopover(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 지역 선택 영역 (3칸: 시/구/동) */}
            <div className="flex" style={{ height: '320px' }}>
              {/* 시·도 */}
              <div className="w-1/3 overflow-y-auto scrollbar-hide border-r border-gray-200">
                {isSidosLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">로딩 중...</div>
                ) : sidos.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">시·도가 없습니다</div>
                ) : (
                  sidos.map(sido => (
                    <button
                      key={sido.sidoId || sido.id}
                      type="button"
                      onClick={() => {
                        setActiveSidoId(sido.sidoId || sido.id);
                        setActiveGunguId(null); // 시·도 변경 시 구·군 초기화
                      }}
                      className={`w-full text-left py-2.5 px-3 text-sm transition-all ${
                        activeSidoId === (sido.sidoId || sido.id)
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {sido.sidoName || sido.name}
                    </button>
                  ))
                )}
              </div>

              {/* 구·군 */}
              <div className="w-1/3 overflow-y-auto scrollbar-hide border-r border-gray-200 bg-gray-50">
                {!activeSidoId ? (
                  // 시·도 선택 전에는 아무것도 표시 안 함
                  null
                ) : isGungusLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">로딩 중...</div>
                ) : gungus.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">구·군이 없습니다</div>
                ) : (
                  gungus.map((gungu) => (
                    <button
                      key={gungu.gunguId || gungu.id}
                      type="button"
                      onClick={() => setActiveGunguId(gungu.gunguId || gungu.id)}
                      className={`w-full text-left py-2.5 px-3 text-sm transition-all ${
                        activeGunguId === (gungu.gunguId || gungu.id)
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {gungu.gunguName || gungu.name}
                    </button>
                  ))
                )}
              </div>

              {/* 동 */}
              <div className="w-1/3 overflow-y-auto scrollbar-hide">
                {!activeGunguId ? (
                  // 구·군 선택 전에는 아무것도 표시 안 함
                  null
                ) : isDongsLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">로딩 중...</div>
                ) : dongs.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">동이 없습니다</div>
                ) : (
                  dongs.map((dong) => (
                    <button
                      key={dong.dongId || dong.id}
                      type="button"
                      onClick={() => {
                        const selectedSido = sidos.find(s => (s.sidoId || s.id) === activeSidoId);
                        const selectedGungu = gungus.find(g => (g.gunguId || g.id) === activeGunguId);
                        const selectedDong = dong;

                        updateField('sidoId', activeSidoId);
                        updateField('gunguId', activeGunguId);
                        updateField('dongId', dong.dongId || dong.id);

                        setSelectedRegionName(
                          `${selectedSido?.sidoName || selectedSido?.name} ${selectedGungu?.gunguName || selectedGungu?.name} ${selectedDong?.dongName || selectedDong?.name}`
                        );
                        setShowRegionPopover(false);
                      }}
                      className={`w-full text-left py-2.5 px-3 text-sm transition-all ${
                        form.dongId === (dong.dongId || dong.id)
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {dong.dongName || dong.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCreatePage;

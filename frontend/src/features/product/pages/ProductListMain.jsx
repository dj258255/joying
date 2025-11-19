import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import ProductCardLikeWrapper from '../components/ProductCardLikeWrapper';
import HashtagFilter from '../components/HashtagFilter';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import ProfileImage from '@/shared/components/ProfileImage';
import { PRODUCT_TYPES } from '../../../shared/constants/productTypes';
import { ROUTE_PATHS } from '../../../shared/constants/routePaths';
import { useAuth, kakaoLogin } from '@/features/auth';
import { useProducts } from '../hooks/useProducts';
import { useInfiniteSearch } from '../../search/hooks/useSearch';
import { useCategoryTree } from '@/features/category';
import { useSearchParams } from 'react-router-dom';
import { useSidos, useGungus, useDongs } from '@/features/region/hooks/useRegions';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import logo from '@/assets/icons/logo_dark.png';
import { searchApi } from '../../search/api/searchApi';

const ProductListMain = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // 사이드 네비게이션 상태
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  
  // 필터 상태 (임시 - UI에만 반영)
  const [activeTab, setActiveTab] = useState('rent');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedSido, setSelectedSido] = useState(null);
  const [selectedGungu, setSelectedGungu] = useState(null);
  const [selectedDong, setSelectedDong] = useState(null);
  const [rating, setRating] = useState(0);
  const [sameDayRental, setSameDayRental] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchWrapperRef = useRef(null);

  // 적용된 필터 상태 (실제 API 호출에 사용)
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '',
    selectedDates: { start: null, end: null },
    priceRange: { min: '', max: '' },
    selectedSubcategories: [],
    selectedSido: null,
    selectedGungu: null,
    selectedDong: null,
    rating: 0,
    sameDayRental: false,
    selectedHashtags: []
  });

  const q = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const lastAppliedFilters = React.useRef(null);
  const isInitialLoad = React.useRef(true);

  // URL 파라미터에서 필터 상태 복원하는 함수
  const getFiltersFromURL = React.useCallback(() => {
    const hashtagsParam = searchParams.get('hashtags');
    let selectedHashtags = [];
    if (hashtagsParam) {
      try {
        selectedHashtags = JSON.parse(hashtagsParam);
      } catch (e) {
        console.error('해시태그 파싱 오류:', e);
        selectedHashtags = [];
      }
    }

    const filters = {
      searchQuery: searchParams.get('q') || '',
      selectedDates: {
        start: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')) : null,
        end: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')) : null
      },
      priceRange: {
        min: searchParams.get('priceMin') || '',
        max: searchParams.get('priceMax') || ''
      },
      selectedSubcategories: [], // 나중에 categories 로드 후 복원
      selectedSido: null,
      selectedGungu: null,
      selectedDong: null, // 나중에 regions 로드 후 복원
      rating: parseFloat(searchParams.get('rating')) || 0,
      sameDayRental: searchParams.get('sameDayRental') === 'true',
      selectedHashtags: selectedHashtags
    };
    return filters;
  }, [searchParams]);

  // 필터 상태를 URL 파라미터로 저장하는 함수
  const updateURLWithFilters = React.useCallback((filters) => {
    const params = new URLSearchParams();

    if (filters.searchQuery) params.set('q', filters.searchQuery);
    if (filters.selectedDates.start) params.set('dateFrom', formatToLocalDate(filters.selectedDates.start));
    if (filters.selectedDates.end) params.set('dateTo', formatToLocalDate(filters.selectedDates.end));
    if (filters.priceRange.min) params.set('priceMin', filters.priceRange.min.toString().replace(/,/g, ''));
    if (filters.priceRange.max) params.set('priceMax', filters.priceRange.max.toString().replace(/,/g, ''));
    if (filters.selectedSubcategories.length > 0) {
      params.set('category', filters.selectedSubcategories[0].categoryId.toString());
    }
    if (filters.selectedSido) params.set('sido', filters.selectedSido.id || filters.selectedSido.sidoId);
    if (filters.selectedGungu) params.set('gungu', filters.selectedGungu.id || filters.selectedGungu.gunguId);
    if (filters.selectedDong) params.set('dong', filters.selectedDong.id || filters.selectedDong.dongId);
    if (filters.rating > 0) params.set('rating', filters.rating.toString());
    if (filters.sameDayRental) params.set('sameDayRental', 'true');
    if (filters.selectedHashtags && filters.selectedHashtags.length > 0) {
      params.set('hashtags', JSON.stringify(filters.selectedHashtags.map(h => ({ id: h.id, name: h.name }))));
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // 지역 팝오버 관련 상태
  const [showRegionPopover, setShowRegionPopover] = useState(false);
  const [activeSidoId, setActiveSidoId] = useState(null);
  const [activeGunguId, setActiveGunguId] = useState(null);
  const [selectedRegionName, setSelectedRegionName] = useState('');
  const regionButtonRef = React.useRef(null);
  const [popoverPosition, setPopoverPosition] = React.useState({ top: 0, left: 0 });
  const categoryButtonRef = React.useRef(null);
  const [categoryPopoverPosition, setCategoryPopoverPosition] = React.useState({ top: 0, left: 0 });

  const { data: sidos = [], isLoading: isSidosLoading } = useSidos();
  const { data: gungus = [], isLoading: isGungusLoading } = useGungus(activeSidoId);
  const { data: dongs = [], isLoading: isDongsLoading } = useDongs(activeGunguId);

  // 첫 번째 시도 자동 선택
  React.useEffect(() => {
    if (sidos.length > 0 && !activeSidoId && showRegionPopover) {
      setActiveSidoId(sidos[0].sidoId || sidos[0].id);
      setSelectedSido(sidos[0]);
    }
  }, [sidos, activeSidoId, showRegionPopover]);

  // location.state에서 해시태그 필터 받아오기 (상품 상세 페이지에서 넘어온 경우)
  React.useEffect(() => {
    if (location.state?.filterByHashtag) {
      const hashtag = location.state.filterByHashtag;
      console.log('🏷️ [ProductListMain] 상품 상세에서 해시태그 필터 적용:', hashtag);

      // 해시태그를 선택 상태에 추가
      setSelectedHashtags([hashtag]);
      setAppliedFilters(prev => ({
        ...prev,
        selectedHashtags: [hashtag]
      }));

      // location.state 초기화 (뒤로가기 시 다시 적용되지 않도록)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // 컴포넌트 마운트 시 URL에서 필터 복원
  React.useEffect(() => {
    if (isInitialLoad.current && searchParams.toString()) {
      console.log('🔄 [ProductListMain] 초기 로드 - URL에서 필터 복원');
      const urlFilters = getFiltersFromURL();

      // 기본 필터들 복원
      setSearchQuery(urlFilters.searchQuery);
      setSelectedDates(urlFilters.selectedDates);
      setPriceRange(urlFilters.priceRange);
      setRating(urlFilters.rating);
      setSameDayRental(urlFilters.sameDayRental);
      setSelectedHashtags(urlFilters.selectedHashtags);

      // 적용된 필터에도 반영 (카테고리와 지역은 제외, 별도 처리됨)
      setAppliedFilters(prev => ({
        ...prev,
        searchQuery: urlFilters.searchQuery,
        selectedDates: urlFilters.selectedDates,
        priceRange: urlFilters.priceRange,
        rating: urlFilters.rating,
        sameDayRental: urlFilters.sameDayRental,
        selectedHashtags: urlFilters.selectedHashtags
      }));

      isInitialLoad.current = false;
    }
  }, [searchParams, getFiltersFromURL]);

  React.useEffect(() => {
    if (q) {
      setSearchQuery(q);
      // URL 파라미터에서 검색어를 받으면 appliedFilters에도 자동으로 반영
      setAppliedFilters(prev => ({
        ...prev,
        searchQuery: q
      }));
    } else if (q === '') {
      // q가 빈 문자열이면 검색어 초기화
      setSearchQuery('');
      setAppliedFilters(prev => ({
        ...prev,
        searchQuery: ''
      }));
    }
  }, [q]);

  // 카테고리 API 조회
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategoryTree();

  // URL에서 category 파라미터를 읽어 자동으로 필터 적용
  // 컴포넌트 마운트 시 한 번만 실행 (categoryParam이 있을 때만)
  const categoryAppliedRef = React.useRef(false);
  React.useEffect(() => {
    // 이미 적용했거나, categoryParam이 없거나, categories가 로드되지 않았으면 스킵
    if (categoryAppliedRef.current || !categoryParam || categories.length === 0) {
      return;
    }
    
    const categoryId = parseInt(categoryParam, 10);
    
    // 하위 카테고리에서 찾기
    for (const mainCat of categories) {
      const subCategory = mainCat.children?.find(sub => sub.categoryId === categoryId);
      if (subCategory) {
        console.log('🏷️ [ProductListMain] URL 카테고리 파라미터 적용:', subCategory.categoryName);
        setSelectedSubcategories([subCategory]);
        setAppliedFilters(prev => ({
          ...prev,
          selectedSubcategories: [subCategory]
        }));
        categoryAppliedRef.current = true; // 적용 완료 표시
        break;
      }
    }
  }, [categoryParam, categories]);
  
  // URL 파라미터가 없어지면 (상세 페이지에서 /products로 돌아올 때) ref 초기화
  React.useEffect(() => {
    if (!categoryParam && categoryAppliedRef.current) {
      console.log('🔄 [ProductListMain] URL 카테고리 파라미터 제거 감지 - ref 초기화');
      categoryAppliedRef.current = false;
    }
  }, [categoryParam]);
  
  // 카테고리 로드 후 첫 번째 카테고리 자동 선택
  React.useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].categoryId);
    }
  }, [categories, activeCategoryId]);

  const formatToLocalDate = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // API 필터 파라미터 생성 (적용된 필터 기반)
  const apiFilters = useMemo(() => ({
    uploadType: activeTab, // 'rent' 또는 'borrow' (즉시 반영)
    q: appliedFilters.searchQuery,
    category: appliedFilters.selectedSubcategories.length > 0 ? appliedFilters.selectedSubcategories.map(c => c.categoryId) : [],
    "price-min": appliedFilters.priceRange.min ? parseInt(appliedFilters.priceRange.min.toString().replace(/,/g, ''), 10) : null,
    "price-max": appliedFilters.priceRange.max ? parseInt(appliedFilters.priceRange.max.toString().replace(/,/g, ''), 10) : null,
    sido: appliedFilters.selectedSido !== null ? appliedFilters.selectedSido.id : null,
    gungu: appliedFilters.selectedGungu !== null ? appliedFilters.selectedGungu.id : null,
    dong: appliedFilters.selectedDong !== null ? appliedFilters.selectedDong.id : null,
    rating: appliedFilters.rating,
    sameDayRental: appliedFilters.sameDayRental,
    "date-from": appliedFilters.selectedDates.start ? formatToLocalDate(appliedFilters.selectedDates.start) : null,
    "date-to": appliedFilters.selectedDates.end ? formatToLocalDate(appliedFilters.selectedDates.end) : null
  }), [
    activeTab,
    appliedFilters.searchQuery,
    appliedFilters.selectedSubcategories,
    appliedFilters.priceRange,
    appliedFilters.selectedSido,
    appliedFilters.selectedGungu,
    appliedFilters.selectedDong,
    appliedFilters.rating,
    appliedFilters.sameDayRental,
    appliedFilters.selectedHashtags,
    appliedFilters.selectedDates
  ]);

  // 🚀 React Query Infinite Scroll로 상품 데이터 가져오기
  const {
    products,
    hashtags,
    total,
    fetchCount,
    isLoading,
    isFetchingNextPage,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    refetch
  } = useInfiniteSearch(apiFilters.q || '', apiFilters);

  console.log('🎯 [ProductListMain] useInfiniteSearch 결과:', {
    productsCount: products?.length || 0,
    total,
    hashtagsCount: hashtags?.length || 0,
    isLoading,
    isFetchingNextPage,
    isError,
    error: error?.message,
    hasNextPage
  });

  React.useEffect(() => {
    console.log('🔄 [ProductListMain] 컴포넌트 마운트');
    // useInfiniteQuery의 enabled: true로 자동 실행됨
    lastAppliedFilters.current = apiFilters;
  }, [apiFilters]);

  // activeTab(빌려줘/구해요) 변경 시 즉시 검색 재실행
  React.useEffect(() => {
    // 첫 마운트가 아닐 때만 실행 (lastAppliedFilters가 설정된 후)
    if (lastAppliedFilters.current !== null) {
      console.log('🔄 [ProductListMain] activeTab 변경 감지 - 즉시 refetch:', activeTab);
      // useInfiniteSearch가 내부적으로 페이지 및 데이터를 관리하므로 수동 초기화 불필요
      refetch().then((result) => {
        console.log('✅ [ProductListMain] activeTab refetch 완료:', result);
      }).catch((err) => {
        console.error('❌ [ProductListMain] activeTab refetch 에러:', err);
      });
      lastAppliedFilters.current = apiFilters;
    }
  }, [activeTab]);

  // appliedFilters 변경 시 검색 재실행 (필터 적용 버튼 클릭 시)
  // 필터 직렬화 for 정확한 비교
  const appliedFiltersKey = React.useMemo(() => {
    return JSON.stringify({
      searchQuery: appliedFilters.searchQuery,
      selectedDates: appliedFilters.selectedDates,
      priceRange: appliedFilters.priceRange,
      selectedSubcategories: appliedFilters.selectedSubcategories.map(c => c.categoryId),
      selectedSido: appliedFilters.selectedSido?.id,
      selectedGungu: appliedFilters.selectedGungu?.id,
      selectedDong: appliedFilters.selectedDong?.id,
      rating: appliedFilters.rating,
      sameDayRental: appliedFilters.sameDayRental,
      selectedHashtags: appliedFilters.selectedHashtags.map(h => h.id || h.name)
    });
  }, [appliedFilters]);

  React.useEffect(() => {
    // 첫 마운트는 제외 (lastAppliedFilters가 설정된 후에만 실행)
    if (lastAppliedFilters.current !== null) {
      console.log('🔄 [ProductListMain] appliedFilters 변경 감지 - refetch 호출');
      // useInfiniteSearch가 내부적으로 페이지 및 데이터를 관리하므로 수동 초기화 불필요
      refetch().then((result) => {
        console.log('✅ [ProductListMain] appliedFilters refetch 완료:', result);
      }).catch((err) => {
        console.error('❌ [ProductListMain] appliedFilters refetch 에러:', err);
      });
      lastAppliedFilters.current = apiFilters;
    }
  }, [appliedFiltersKey, refetch, apiFilters]);

  // SEARCH 쿼리 무효화 시 자동 refetch
  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === QUERY_KEYS.SEARCH) {
        // 현재 activeTab과 일치하는 쿼리인지 확인
        const queryFilters = event?.query?.queryKey?.[2];
        if (queryFilters?.uploadType !== activeTab) {
          return; // 다른 탭의 쿼리는 무시
        }
        
        if (event?.type === 'removed' || (event?.type === 'updated' && event?.query?.isInvalidated)) {
          // 쿼리가 무효화되면 refetch
          console.log('[ProductListMain] SEARCH 쿼리 무효화 감지, refetch 실행');
          refetch();
        }
      }
    });
    
    return unsubscribe;
  }, [queryClient, refetch, activeTab]);

  // 페이지 포커스 시 SEARCH 쿼리 무효화되어 있으면 refetch
  React.useEffect(() => {
    const handleFocus = () => {
      const searchQuery = queryClient.getQueryState([QUERY_KEYS.SEARCH, q || '', apiFilters]);
      if (searchQuery && (searchQuery.isInvalidated || searchQuery.isStale)) {
        console.log('[ProductListMain] 페이지 포커스, SEARCH 쿼리 refetch');
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient, refetch, q, apiFilters]);

  // 자동완성 기능: 검색어 변경 시 자동완성 제안 조회
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 1) {
        try {
          const data = await searchApi.autocomplete(searchQuery);
          setSuggestions(data || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('자동완성 조회 실패:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300); // 300ms 디바운스
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 자동완성: 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    if (!selectedDates.start) {
      setSelectedDates({ start: date, end: null });
    } else if (!selectedDates.end) {
      if (date >= selectedDates.start) {
        setSelectedDates(prev => ({ ...prev, end: date }));
      } else {
        setSelectedDates({ start: date, end: null });
      }
    } else {
      setSelectedDates({ start: date, end: null });
    }
  };

  const isDateInRange = (date) => {
    if (!date || !selectedDates.start || !selectedDates.end) return false;
    return date >= selectedDates.start && date <= selectedDates.end;
  };

  const isTodayDate = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return (selectedDates.start && date.getTime() === selectedDates.start.getTime()) ||
           (selectedDates.end && date.getTime() === selectedDates.end.getTime());
  };

  const formatDateRange = () => {
    if (!selectedDates.start) return '';
    if (!selectedDates.end) return '';
    const daysDiff = Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24)) + 1;
    return `총 ${daysDiff}일`;
  };

  const formatPrice = (value) => {
    if (!value) return '';
    return parseInt(value).toLocaleString();
  };

  const handlePriceBlur = (type) => {
    const value = priceRange[type];
    if (value) {
      const numValue = parseInt(value.replace(/,/g, ''), 10);
      if (isNaN(numValue)) {
        setPriceRange(prev => ({ ...prev, [type]: '' }));
        setPriceError('');
        return;
      }
      
      const formattedValue = formatPrice(String(numValue));
      setPriceRange(prev => {
        const newRange = { ...prev, [type]: formattedValue };
        
        // 최소 금액과 최대 금액 비교
        const minNum = type === 'min' ? numValue : (prev.min ? parseInt(prev.min.replace(/,/g, ''), 10) : null);
        const maxNum = type === 'max' ? numValue : (prev.max ? parseInt(prev.max.replace(/,/g, ''), 10) : null);
        
        if (minNum !== null && maxNum !== null && minNum > maxNum) {
          setPriceError('최소 금액은 최대 금액보다 클 수 없습니다.');
          // 최소 금액이 최대 금액보다 크면 최대 금액으로 조정
          if (type === 'min') {
            return { ...newRange, min: formatPrice(String(maxNum)) };
          } else {
            return { ...newRange, max: formatPrice(String(minNum)) };
          }
        } else {
          setPriceError('');
          return newRange;
        }
      });
    } else {
      setPriceError('');
    }
  };

  const toggleSubcategory = (subcategory) => {
    setSelectedSubcategories(prev => {
      // 이미 선택된 항목이면 아무 일도 하지 않음
      if (prev.some(s => s.categoryId === subcategory.categoryId)) {
        return prev;
      }
      // 새로운 항목이면 이전 선택을 취소하고 새로운 것만 선택
      return [subcategory];
    });
  };

  const removeSubcategory = (subcategory) => {
    setSelectedSubcategories([]);
  };

  const getSelectedCategoriesText = () => {
    if (selectedSubcategories.length === 0) return '선택하세요';
    if (selectedSubcategories.length === 1) return selectedSubcategories[0].categoryName;
    return `${selectedSubcategories[0].categoryName} 외 ${selectedSubcategories.length - 1}개`;
  };


  const handleStarClick = (e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setRating(newRating);
  };

  const handleReset = () => {
    // 임시 필터 초기화
    setSearchQuery('');
    setSelectedDates({ start: null, end: null });
    setPriceRange({ min: '', max: '' });
    setSelectedSubcategories([]);
    setSelectedSido(null);
    setSelectedGungu(null);
    setSelectedDong(null);
    setActiveSidoId(null);
    setActiveGunguId(null);
    setSelectedRegionName('');
    setRating(0);
    setSameDayRental(false);
    setSelectedHashtags([]);

    // 적용된 필터도 초기화
    const resetFilters = {
      searchQuery: '',
      selectedDates: { start: null, end: null },
      priceRange: { min: '', max: '' },
      selectedSubcategories: [],
      selectedSido: null,
      selectedGungu: null,
      selectedDong: null,
      rating: 0,
      sameDayRental: false,
      selectedHashtags: []
    };

    setAppliedFilters(resetFilters);

    // URL도 초기화
    setSearchParams({}, { replace: true });
  };

  const handleHashtagSelect = (hashtag, isRemove = false) => {
    // 해시태그 유효성 검사
    if (!hashtag || !hashtag.id || !hashtag.name) {
      console.warn('[ProductListMain] 잘못된 해시태그:', hashtag);
      return;
    }

    if (isRemove) {
      setSelectedHashtags(prev => prev.filter(h => h && h.id !== hashtag.id));
    } else {
      const isAlreadySelected = selectedHashtags.some(h => h && h.id === hashtag.id);
      if (!isAlreadySelected) {
        setSelectedHashtags(prev => [...prev, hashtag]);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (selectedHashtags.length === 0) return products;

    return products.filter((product) => {
      if (!product.hashtags || product.hashtags.length === 0) return false;

      const productHashtagNames = product.hashtags.map((h) =>
        typeof h === "string" ? h : h.name
      );

      const selectedNames = selectedHashtags.map((h) => h.name);

      // 선택된 모든 해시태그 이름이 포함되어야 함
      return selectedNames.every((name) => productHashtagNames.includes(name));
    });
  }, [products, selectedHashtags]);

  const handleApply = async () => {
    console.log('🔵 [ProductListMain] 필터 적용 시작:', {
      searchQuery,
      dateRange: selectedDates,
      priceRange,
      subcategories: selectedSubcategories,
      region: selectedDong,
      rating,
      sameDayRental,
      hashtags: selectedHashtags
    });

    // useInfiniteSearch가 내부적으로 페이지 및 데이터를 관리하므로 수동 초기화 불필요

    const newFilters = {
      searchQuery,
      selectedDates,
      priceRange,
      selectedSubcategories,
      selectedSido,
      selectedGungu,
      selectedDong,
      rating,
      sameDayRental,
      selectedHashtags
    };

    // 임시 필터를 적용된 필터로 복사 (이것이 useEffect를 트리거)
    setAppliedFilters(newFilters);

    // URL에 필터 상태 저장
    updateURLWithFilters(newFilters);

    console.log('✅ [ProductListMain] 필터 적용:', {
      searchQuery,
      dateRange: selectedDates,
      priceRange,
      subcategories: selectedSubcategories,
      region: selectedDong,
      rating,
      sameDayRental,
      hashtags: selectedHashtags
    });

    handleCloseFilter();
  };

  const handleCloseFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300); // 애니메이션 시간과 동일 (0.3s)
  };

  // 검색 실행 함수
  const handleSearch = () => {
    setAppliedFilters(prev => ({
      ...prev,
      searchQuery
    }));
    console.log('🔍 [ProductListMain] 검색 실행:', searchQuery);
  };

  // Enter 키 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreateProduct = () => {
    navigate(ROUTE_PATHS.PRODUCT_CREATE);
  };

  const observerRef = React.useRef(null);

  // 🚀 useInfiniteQuery 무한스크롤: IntersectionObserver로 fetchNextPage 호출
  React.useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // 화면에 보이고, 로딩중이 아니고, 다음 페이지가 있으면 자동 로드
        if (entry.isIntersecting && !isLoading && !isFetchingNextPage && hasNextPage) {
          console.log('👁️ [ProductListMain] Observer 트리거 - fetchNextPage 호출');
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [observerRef, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="flex h-screen bg-white">
      {/* 로고 - 필터 사이드바 바로 옆 (데스크톱) */}
      <div className="hidden lg:flex fixed top-4 left-[272px] z-[100]">
        <img
          src={logo}
          alt="빌려joying"
          className="h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(ROUTE_PATHS.HOME)}
        />
      </div>

      {/* 우측 상단 프로필/로그인 버튼 - 데스크톱 */}
      <div className="hidden lg:flex fixed top-4 right-4 z-[100] items-center gap-4">
        {isAuthenticated ? (
          // 로그인 상태: 원형 프로필 버튼
          <button
            onClick={() => setIsSideNavOpen(!isSideNavOpen)}
            className="group relative w-9 h-9 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50 overflow-hidden"
            title={user?.nickname || '프로필'}
          >
            <ProfileImage
              src={user?.profileImageUrl}
              alt={user?.nickname || '프로필'}
              size={36}
              className="w-full h-full"
            />
          </button>
        ) : (
          // 미로그인 상태: 로그인하기 버튼 노출
          <button
            onClick={() => kakaoLogin()}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors shadow-sm hover:shadow"
            title="로그인하기"
          >
            로그인하기
          </button>
        )}
      </div>
      
      <SideNavbar isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
      {/* 데스크톱 필터 사이드바 */}
      <div className="hidden lg:block w-64 h-screen overflow-y-auto sticky top-0 scrollbar-hide bg-white border-r border-gray-200">
        <div className="p-4 space-y-4">
          
          {/* 빌려요/구해요 탭 */}
          <div className="mb-4">
           <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
             <button
               onClick={() => setActiveTab('rent')}
               className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                 activeTab === 'rent'
                   ? 'bg-gray-900 text-white shadow-sm'
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               빌려드려요
             </button>
             <button
               onClick={() => setActiveTab('borrow')}
               className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                 activeTab === 'borrow'
                   ? 'bg-gray-900 text-white shadow-sm'
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               빌려요
             </button>
           </div>
          </div>

         {/* 카테고리 */}
         <div className="space-y-3 relative">
           <h3 className="text-base font-semibold text-gray-900">카테고리</h3>
          
          <button
            ref={categoryButtonRef}
            onClick={() => {
              if (!showCategoryPopover && categoryButtonRef.current) {
                const rect = categoryButtonRef.current.getBoundingClientRect();
                setCategoryPopoverPosition({
                  top: rect.top,
                  left: rect.right + 8
                });
              }
              setShowCategoryPopover(!showCategoryPopover);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis rounded-xl transition-all duration-300 hover:shadow-lg"
            style={{ 
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
            }}
          >
            {getSelectedCategoriesText()}
          </button>

          {showCategoryPopover && ReactDOM.createPortal(
            <>
              {/* 백드롭 */}
              <div 
                className="hidden lg:block fixed inset-0 z-[150]"
                onClick={() => setShowCategoryPopover(false)}
              />
              
              {/* 우측 팝오버 - 버튼 옆에 표시 */}
              <div 
                className="hidden lg:block fixed rounded-xl overflow-hidden z-[160] animate-slideInFromLeft" 
                style={{ 
                  top: `${categoryPopoverPosition.top}px`,
                  left: `${categoryPopoverPosition.left}px`,
                  width: '400px',
                  maxHeight: 'min(400px, calc(100vh - 200px))',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }}
              >
                <div className="flex" style={{ height: '340px' }}>
                  {/* 상위 카테고리 */}
                  <div className="w-1/2 h-full overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    {isCategoriesLoading ? (
                      <div className="p-4 text-center text-xs text-gray-500">카테고리 로딩 중...</div>
                    ) : categories.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">카테고리가 없습니다</div>
                    ) : (
                      categories.map(category => (
                        <button
                          key={category.categoryId}
                          onClick={() => setActiveCategoryId(category.categoryId)}
                          className={`w-full px-3 py-2 text-left text-xs transition-all duration-200 ${
                            activeCategoryId === category.categoryId
                              ? 'bg-gray-900 text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {category.categoryName}
                        </button>
                      ))
                    )}
                  </div>

                  {/* 하위 카테고리 */}
                  <div className="w-1/2 h-full overflow-y-auto scrollbar-hide">
                    {categories.find(c => c.categoryId === activeCategoryId)?.children?.map((sub) => (
                      <button
                        key={sub.categoryId}
                        onClick={() => toggleSubcategory(sub)}
                        className={`w-full text-left py-2 px-3 text-xs transition-all duration-200 ${
                          selectedSubcategories.some(s => s.categoryId === sub.categoryId)
                            ? 'bg-gray-900 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sub.categoryName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[60px] p-3 bg-white" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <button
                    onClick={() => setShowCategoryPopover(false)}
                    className="w-full h-full rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-black transition-colors"
                  >
                    선택 완료
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}

          {selectedSubcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-hidden">
              {selectedSubcategories.map((sub, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full overflow-hidden whitespace-nowrap text-ellipsis max-w-full transition-all duration-200"
                   style={{ 
                     background: 'rgba(17, 24, 39, 0.08)',
                     color: '#111827',
                     border: '1px solid rgba(17, 24, 39, 0.2)',
                     backdropFilter: 'blur(10px)'
                   }}
                >
                  <span className="truncate">{sub.categoryName}</span>
                  <button
                    onClick={() => removeSubcategory(sub)}
                    className="flex-shrink-0 transition-opacity duration-200 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

         <div className="space-y-3 relative">
          <h3 className="text-base font-semibold text-gray-900">지역 (시 · 구 · 동)</h3>

          <button
            ref={regionButtonRef}
            type="button"
            onClick={() => {
              if (!showRegionPopover && regionButtonRef.current) {
                const rect = regionButtonRef.current.getBoundingClientRect();
                setPopoverPosition({
                  top: rect.top,
                  left: rect.right + 8
                });
              }
              setShowRegionPopover(!showRegionPopover);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis rounded-xl transition-all duration-300 hover:shadow-lg"
            style={{ 
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
            }}
          >
            {selectedRegionName || '지역을 선택하세요'}
          </button>

          {showRegionPopover && ReactDOM.createPortal(
            <>
              {/* 백드롭 */}
              <div 
                className="hidden lg:block fixed inset-0 z-[150]"
                onClick={() => setShowRegionPopover(false)}
              />
              
              {/* 우측 팝오버 - 버튼 옆에 표시 */}
              <div 
                className="hidden lg:block fixed rounded-xl overflow-hidden z-[160] animate-slideInFromLeft" 
                style={{ 
                  top: `${popoverPosition.top}px`,
                  left: `${popoverPosition.left}px`,
                  width: '400px',
                  maxHeight: 'min(310px, calc(100vh - 200px))',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }}
              >
                <div className="flex" style={{ height: '240px' }}>
                  {/* 시/도 */}
                  <div className="w-1/3 h-full overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    {isSidosLoading ? (
                      <div className="p-4 text-center text-xs text-gray-500">로딩 중...</div>
                    ) : sidos.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">시/도가 없습니다</div>
                    ) : (
                      sidos.map((sido) => (
                        <button
                          key={sido.sidoId || sido.id}
                          type="button"
                          onClick={() => {
                            setActiveSidoId(sido.sidoId || sido.id);
                            setActiveGunguId(null);
                            setSelectedSido(sido);
                            setSelectedGungu(null);
                            setSelectedDong(null);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs transition-all duration-200 ${
                            activeSidoId === (sido.sidoId || sido.id)
                              ? 'bg-gray-900 text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {sido.sidoName || sido.name}
                        </button>
                      ))
                    )}
                  </div>

                  {/* 구/군 */}
                  <div className="w-1/3 h-full overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    {!activeSidoId ? null : isGungusLoading ? (
                      <div className="p-2 text-center text-xs text-gray-500">로딩 중...</div>
                    ) : gungus.length === 0 ? (
                      <div className="p-2 text-center text-xs text-gray-500">구·군이 없습니다</div>
                    ) : (
                      gungus.map((gungu) => (
                        <button
                          key={gungu.gunguId || gungu.id}
                          type="button"
                          onClick={() => {
                            setActiveGunguId(gungu.gunguId || gungu.id);
                            setSelectedGungu(gungu);
                            setSelectedDong(null);
                          }}
                          className={`w-full text-left py-2 px-3 text-xs transition-all duration-200 ${
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
                  <div className="w-1/3 h-full overflow-y-auto scrollbar-hide">
                    {!activeGunguId ? null : isDongsLoading ? (
                      <div className="p-2 text-center text-xs text-gray-500">로딩 중...</div>
                    ) : dongs.length === 0 ? (
                      <div className="p-2 text-center text-xs text-gray-500">동이 없습니다</div>
                    ) : (
                      dongs.map((dong) => (
                        <button
                          key={dong.dongId || dong.id}
                          type="button"
                          onClick={() => {
                            setSelectedDong(dong);
                          }}
                          className={`w-full text-left py-2 px-3 text-xs transition-all duration-200 ${
                            selectedDong?.dongId === (dong.dongId || dong.id) || selectedDong?.id === (dong.dongId || dong.id)
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

                <div className="h-[60px] p-3 bg-white" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      let finalName = "";

                      if (selectedDong) {
                        finalName = `${selectedSido?.sidoName || selectedSido?.name} ${selectedGungu?.gunguName || selectedGungu?.name} ${selectedDong?.dongName || selectedDong?.name}`;
                      } else if (selectedGungu) {
                        finalName = `${selectedSido?.sidoName || selectedSido?.name} ${selectedGungu?.gunguName || selectedGungu?.name}`;
                      } else if (selectedSido) {
                        finalName = `${selectedSido?.sidoName || selectedSido?.name}`;
                      }

                      setSelectedRegionName(finalName);
                      setShowRegionPopover(false);
                  }}
                    className="w-full h-full rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-black transition-colors"
                  >
                    선택 완료
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

         {/* 가격 범위 */}
         <div className="space-y-3">
           <h3 className="text-base font-extrabold text-gray-900">가격 범위</h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="최소 금액"
              value={priceRange.min}
              onChange={(e) => {
                const newMin = e.target.value.replace(/[^0-9]/g, '');
                setPriceRange(prev => {
                  const newRange = { ...prev, min: newMin };
                  // 실시간 검증
                  if (newMin && prev.max) {
                    const minNum = parseInt(newMin.replace(/,/g, ''), 10);
                    const maxNum = parseInt(prev.max.replace(/,/g, ''), 10);
                    if (!isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
                      setPriceError('최소 금액은 최대 금액보다 클 수 없습니다.');
                    } else {
                      setPriceError('');
                    }
                  } else {
                    setPriceError('');
                  }
                  return newRange;
                });
              }}
              onBlur={() => handlePriceBlur('min')}
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 overflow-hidden text-ellipsis rounded-xl transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: priceError ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
            <input
              type="text"
              placeholder="최대 금액"
              value={priceRange.max}
              onChange={(e) => {
                const newMax = e.target.value.replace(/[^0-9]/g, '');
                setPriceRange(prev => {
                  const newRange = { ...prev, max: newMax };
                  // 실시간 검증
                  if (newMax && prev.min) {
                    const minNum = parseInt(prev.min.replace(/,/g, ''), 10);
                    const maxNum = parseInt(newMax.replace(/,/g, ''), 10);
                    if (!isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
                      setPriceError('최소 금액은 최대 금액보다 클 수 없습니다.');
                    } else {
                      setPriceError('');
                    }
                  } else {
                    setPriceError('');
                  }
                  return newRange;
                });
              }}
              onBlur={() => handlePriceBlur('max')}
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 overflow-hidden text-ellipsis rounded-xl transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: priceError ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
          </div>
          {priceError && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium flex-1">{priceError}</span>
              <button
                type="button"
                onClick={() => setPriceError('')}
                className="text-current opacity-70 hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 날짜 기간 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">날짜 기간</h3>
            {formatDateRange() && (
              <span className="text-xs font-bold text-gray-900">
                {formatDateRange()}
              </span>
            )}
          </div>

          {/* 캘린더 */}
          <div className="p-4 rounded-2xl" style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(25px)',
            border: '1.5px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.12), inset 0 0 20px rgba(255, 255, 255, 0.6)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span className="text-lg text-gray-700">‹</span>
              </button>
              <h4 className="text-sm font-semibold text-gray-800">
                {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </h4>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span className="text-lg text-gray-700">›</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => (
                <button
                  key={index}
                  onClick={() => date && handleDateClick(date)}
                  disabled={!date}
                  className={`
                    aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-200
                    ${!date ? 'invisible' : ''}
                    ${isDateSelected(date) || isDateInRange(date)
                      ? 'text-white font-semibold'
                      : 'text-gray-700'
                    }
                  `}
                   style={isDateSelected(date) || isDateInRange(date) ? {
                     background: 'linear-gradient(135deg, #1f2937, #111827)',
                     boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                   } : {
                    background: 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  {date && date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>

         {/* 당일 대여 */}
         <div className="space-y-3">
           <h3 className="text-base font-semibold text-gray-900">당일 대여 가능</h3>

          <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-300" style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
          }}>
            <span className="text-sm text-gray-700">당일 대여 가능</span>
            <button
              onClick={() => setSameDayRental(!sameDayRental)}
              className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
               style={{
                 minWidth: '52px',
                 height: '32px',
                 background: sameDayRental
                   ? 'linear-gradient(135deg, #1f2937, #111827)'
                   : 'rgba(229, 231, 235, 0.8)',
                 backdropFilter: 'blur(10px)',
                 boxShadow: sameDayRental
                   ? '0 4px 12px rgba(0, 0, 0, 0.25)'
                   : '0 2px 8px rgba(0, 0, 0, 0.1)'
               }}
            >
              <span
                className="inline-block rounded-full bg-white transition-all duration-300"
                style={{
                  width: '28px',
                  height: '28px',
                  transform: sameDayRental ? 'translateX(22px)' : 'translateX(2px)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                }}
              />
            </button>
          </div>
        </div>

         {/* 최소 평점 (0.5점 단위, 별 5개만 표시) */}
         <div className="space-y-3">
           <h3 className="text-base font-semibold text-gray-900">최소 평점</h3>
          
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map(star => {
              const isFull = rating >= star;
              const isHalf = rating === star - 0.5;
              
              return (
                <button
                  key={star}
                  onClick={(e) => handleStarClick(e, star)}
                  className="relative transition-transform duration-200 hover:scale-110"
                  style={{ width: '32px', height: '32px' }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    className="absolute left-0 top-0"
                  >
                    <defs>
                      <linearGradient id={`gradient-${star}`}>
                        <stop offset="50%" stopColor={isHalf || isFull ? '#FFD700' : '#E5E7EB'} />
                        <stop offset="50%" stopColor={isFull ? '#FFD700' : '#E5E7EB'} />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                      fill={isHalf ? `url(#gradient-${star})` : isFull ? '#FFD700' : '#E5E7EB'}
                      style={{
                        filter: isFull || isHalf ? 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4))' : 'none',
                        transition: 'all 0.2s'
                      }}
                    />
                  </svg>
                </button>
              );
            })}
          </div>

          {rating > 0 && (
            <div className="text-center">
               <div className="text-sm font-bold text-gray-900">
                 {rating}점 이상
               </div>
               <button
                 onClick={() => setRating(0)}
                 className="text-xs mt-1 text-gray-700 hover:text-gray-900 transition-opacity duration-200 hover:opacity-70"
              >
                평점 초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 p-4 space-y-2 bg-white border-t border-gray-200 z-[60]">
        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          초기화
        </button>
        <button
          onClick={handleApply}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-gray-900 hover:bg-black transition-colors"
        >
          필터 적용
        </button>
       </div>
     </div>


     {/* 메인 콘텐츠 영역 */}
     <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-50">
       {/* 모바일 헤더 */}
       <div className="lg:hidden p-4 bg-white border-b border-gray-200">
         <div className="flex items-center justify-between">
           {/* 토글 스위치 */}
           <div className="relative">
             <button
               onClick={() => setActiveTab(activeTab === 'rent' ? 'borrow' : 'rent')}
               className="relative w-40 h-12 rounded-lg p-1 transition-all duration-300 bg-gray-200"
             >
               {/* 슬라이더 */}
               <div
                 className="absolute top-1 h-10 w-[calc(50%-4px)] rounded-md shadow-md transition-all duration-300 flex items-center justify-center bg-gray-900"
                 style={{
                   left: activeTab === 'rent' ? '4px' : 'calc(50% + 0px)'
                 }}
               />

               {/* 텍스트 레이어 */}
               <div className="absolute inset-0 flex items-center pointer-events-none">
                 <div className="w-1/2 flex items-center justify-center">
                   <span className={`text-xs font-bold transition-colors duration-300 ${activeTab === 'rent' ? 'text-white' : 'text-gray-600'}`}>
                     빌려드려요
                   </span>
                 </div>
                 <div className="w-1/2 flex items-center justify-center">
                   <span className={`text-xs font-bold transition-colors duration-300 ${activeTab === 'borrow' ? 'text-white' : 'text-gray-600'}`}>
                     빌려요
                   </span>
                 </div>
               </div>
             </button>
           </div>

           {/* 모바일 우측 버튼 그룹 */}
           <div className="flex items-center gap-2">
             {/* 로고 */}
             <img
               src={logo}
               alt="빌려joying"
               className="h-8 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
               onClick={() => navigate(ROUTE_PATHS.HOME)}
             />
             {/* 필터 버튼 */}
             <button
               onClick={() => setIsFilterOpen(true)}
               className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
               </svg>
             </button>
             
           {/* 프로필 또는 로그인 버튼 */}
           {isAuthenticated ? (
             <button
               onClick={() => setIsSideNavOpen(!isSideNavOpen)}
               className="w-9 h-9 rounded-full shadow-md hover:shadow-lg transition-all duration-300 ring-2 ring-white/30 overflow-hidden"
               title={user?.nickname || '프로필'}
             >
               <ProfileImage
                 src={user?.profileImageUrl}
                 alt={user?.nickname || '프로필'}
                 size={36}
                 className="w-full h-full"
               />
             </button>
           ) : (
             <button
               onClick={() => kakaoLogin()}
               className="px-3 py-2 rounded-md text-xs font-medium text-white bg-gray-900 hover:bg-black transition-colors shadow-sm"
               title="로그인하기"
             >
               로그인하기
             </button>
           )}
          </div>
         </div>
       </div>

      {/* 검색창 + 해시태그 필터 - 스티키 */}
      <div className="sticky top-0 z-10 pt-4 lg:pt-16 pb-4 px-4 bg-white border-b border-gray-200">
        {/* 검색창 */}
        <div className="mb-4">
          <div ref={searchWrapperRef} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length > 50) {
                  setSearchQuery(value.slice(0, 50));
                } else {
                  setSearchQuery(value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    setSearchQuery(suggestions[selectedIndex]);
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }
                  handleApply();
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  setSelectedIndex(-1);
                }
              }}
              placeholder="상품명을 검색하세요..."
              className="w-full pl-12 pr-12 py-3 text-base
                         bg-gray-50
                         border-2 border-gray-200 rounded-xl
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:border-gray-900 focus:bg-white
                         transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAppliedFilters(prev => ({ ...prev, searchQuery: '' }));
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* 자동완성 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
              {suggestions.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // 상품 페이지로 바로 이동
                    navigate(`/products/${item.productId}`);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    
                    {/* 상품 이미지가 있으면 표시 */}
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-10 h-10 object-cover rounded-md"
                      />
                    ) : (
                      // 이미지 없으면 기본 아이콘
                      <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* 상품명 */}
                    <span className="text-gray-900 truncate">{item.title}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* 해시태그 필터 */}
        <HashtagFilter
          hashtags={hashtags}
          onHashtagSelect={handleHashtagSelect}
          selectedHashtags={selectedHashtags}
        />
      </div>

       {/* 상품 목록 */}
       <div className="flex-1 p-6">
         {/* 로딩 상태 */}
         {isLoading && (
           <div className="flex items-center justify-center py-20">
             <div className="text-center">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
               <p className="text-gray-600">상품을 불러오는 중...</p>
             </div>
           </div>
         )}

         {/* 에러 상태 */}
         {isError && (
           <div className="flex items-center justify-center py-20">
             <div className="text-center">
               <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <p className="text-gray-900 font-semibold mb-2">상품을 불러오는데 실패했습니다</p>
               <p className="text-gray-600 text-sm">{error?.message}</p>
             </div>
           </div>
         )}

         {/* 상품 목록 */}
         {!isLoading && !isError && filteredProducts.length > 0 && (
           <>
             <div className="mb-4 flex items-center justify-between">
               <p className="text-sm text-gray-600">
                 총 <span className="font-semibold text-gray-900">{total}</span>개의 상품
               </p>
             </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCardLikeWrapper
                  key={product.productId}
                  product={product}
                  onClick={() => navigate(`/products/${product.productId}`)}
                  actionType="view"
                  status={product.isAvailable ? 'available' : 'unavailable'}
                  showStats={false}
                  showDate={false}
                />
              ))}
            </div>

            {/* 👇 이 div가 화면에 보이면 다음 페이지 불러옴 */}
            <div ref={observerRef} className="h-10" />

            {/* 다음 페이지 로딩 중 표시 */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">더 불러오는 중...</p>
                </div>
              </div>
            )}
           </>
         )}

         {/* 빈 상태 */}
         {!isLoading && !isError && filteredProducts.length === 0 && (
           <div className="flex items-center justify-center py-20">
             <div className="text-center">
               <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
               </svg>
               <p className="text-gray-900 font-semibold mb-2">검색 결과가 없습니다</p>
               <p className="text-gray-600 text-sm">다른 조건으로 검색해보세요</p>
             </div>
           </div>
         )}
       </div>
     </div>

   {/* 모바일 필터 모달 */}
   {isFilterOpen && (
     <div className={`fixed inset-0 z-[10000] lg:hidden ${isFilterClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
       <div 
         className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isFilterClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
         onClick={handleCloseFilter} 
       />
       <div 
         className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto scrollbar-hide ${isFilterClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
         style={{
           background: 'rgba(255, 255, 255, 0.5)',
           backdropFilter: 'blur(40px) saturate(180%)',
           WebkitBackdropFilter: 'blur(40px) saturate(180%)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
         }}
       >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 drop-shadow-sm">필터</h2>
            <button
              onClick={handleCloseFilter}
               className="p-2 hover:bg-white/30 rounded-lg transition-colors"
             >
               <svg className="w-5 h-5 text-gray-800 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
           
           {/* 모바일 필터 내용 - 데스크톱과 동일한 구조 */}
           <div className="space-y-6">
             {/* 빌려요/구해요 탭 */}
             <div className="mb-6">
               <div className="flex space-x-2 p-1 rounded-xl" style={{
                 background: 'rgba(255, 255, 255, 0.3)',
                 backdropFilter: 'blur(20px) saturate(180%)',
                 WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                 border: '1px solid rgba(255, 255, 255, 0.5)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
               }}>
                 <button
                   onClick={() => setActiveTab('rent')}
                   className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                     activeTab === 'rent'
                       ? 'text-gray-900 shadow-md drop-shadow-sm'
                       : 'text-gray-700 hover:bg-white/20'
                   }`}
                   style={activeTab === 'rent' ? {
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 4px 16px rgba(31, 38, 135, 0.15)'
                   } : {}}
                 >
                   빌려드려요
                 </button>
                 <button
                   onClick={() => setActiveTab('borrow')}
                   className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                     activeTab === 'borrow'
                       ? 'text-gray-900 shadow-md drop-shadow-sm'
                       : 'text-gray-700 hover:bg-white/20'
                   }`}
                   style={activeTab === 'borrow' ? {
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 4px 16px rgba(31, 38, 135, 0.15)'
                   } : {}}
                 >
                   빌려요
                 </button>
               </div>
             </div>

             {/* 해시태그 필터 */}
             <HashtagFilter 
               searchHashtags={hashtags}
               onHashtagSelect={handleHashtagSelect}
               selectedHashtags={selectedHashtags}
             />

             {/* 검색창 */}
             <div className="relative">
               <input
                 type="text"
                 placeholder="상품 검색..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyPress={handleSearchKeyPress}
                 className="w-full px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder-gray-400 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2"
                 style={{ 
                   background: 'rgba(255, 255, 255, 0.8)',
                   backdropFilter: 'blur(20px)',
                   border: '1.5px solid rgba(255, 255, 255, 0.6)',
                   boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.5)',
                   '--tw-ring-color': 'rgb(59 130 246 / 0.3)'
                 }}
               />
               <button
                 onClick={handleSearch}
                 className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-gray-900 transition-colors"
               >
                 <svg 
                   className="w-5 h-5 text-gray-400" 
                   fill="none" 
                   stroke="currentColor" 
                   viewBox="0 0 24 24"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </button>
             </div>

           {/* 날짜 기간 */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <h3 className="text-base font-extrabold text-gray-900">날짜 기간</h3>
               {formatDateRange() && (
                 <span className="text-sm font-bold text-gray-900">
                   {formatDateRange()}
                 </span>
               )}
             </div>

              {/* 캘린더 */}
               <div className="p-4 rounded-2xl" style={{ 
                 background: 'rgba(255, 255, 255, 0.75)',
                 backdropFilter: 'blur(25px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.4)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 <div className="flex items-center justify-between mb-4">
                   <button
                     onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                     className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                     </svg>
                   </button>
                   <h3 className="text-lg font-bold text-gray-800">
                     {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                   </h3>
                   <button
                     onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                     className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </button>
                 </div>
                 
                 <div className="grid grid-cols-7 gap-1 text-center text-sm">
                   {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                     <div key={day} className="p-2 font-semibold text-gray-600">{day}</div>
                   ))}
                   {(() => {
                     const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                     const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                     const startDate = firstDay.getDay();
                     const daysInMonth = lastDay.getDate();
                     
                     const days = [];
                     
                     // 이전 달의 빈 칸들
                     for (let i = 0; i < startDate; i++) {
                       days.push(<div key={`empty-${i}`} className="p-2"></div>);
                     }
                     
                     // 현재 달의 날짜들
                     for (let i = 1; i <= daysInMonth; i++) {
                       const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
                       const isToday = isTodayDate(date);
                       const isSelected = isDateSelected(date);
                       const isInRange = isDateInRange(date);
                       
                       days.push(
                         <button
                           key={i}
                           onClick={() => handleDateClick(date)}
                           className={`p-2 rounded-lg transition-all duration-200 ${
                             isToday ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' : ''
                           } ${
                             isSelected ? 'bg-gray-900 text-white' : ''
                           } ${
                             isInRange && !isSelected ? 'bg-gray-900/30 text-gray-900' : ''
                           } ${
                             !isToday && !isSelected && !isInRange ? 'hover:bg-white/50 text-gray-800' : ''
                           }`}
                         >
                           {i}
                         </button>
                       );
                     }
                     
                     return days;
                   })()}
                 </div>
               </div>
             </div>

             {/* 가격 범위 */}
             <div className="space-y-3">
               <h3 className="text-base font-extrabold text-gray-900">가격 범위</h3>
               
               <div className="flex gap-1">
                 <input
                   type="text"
                   placeholder="최소 금액"
                   value={priceRange.min}
                   onChange={(e) => {
                    let newMin = e.target.value.replace(/[^0-9]/g, '');

                    let num = Number(newMin);

                    const MAX_INT = 2147483647;
                    if (num > MAX_INT) {
                      num = MAX_INT;
                    }
                    if (num < 0) {
                      num = 0;
                    }

                    newMin = String(num);

                    setPriceRange(prev => {
                      const newRange = { ...prev, min: newMin };

                      if (newMin && prev.max) {
                        const minNum = Number(newMin);
                        const maxNum = Number(prev.max);
                        if (minNum > maxNum) {
                          setPriceError('최소 금액은 최대 금액보다 클 수 없습니다.');
                        } else {
                          setPriceError('');
                        }
                      } else {
                        setPriceError('');
                      }
                      return newRange;
                    });
                  }}
                   onBlur={() => handlePriceBlur('min')}
                   className="flex-1 px-2 py-2 text-xs text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: priceError ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)',
                     '--tw-ring-color': 'rgb(59 130 246 / 0.3)'
                   }}
                 />
                 <input
                   type="text"
                   placeholder="최대 금액"
                   value={priceRange.max}
                   onChange={(e) => {
                      let newMax = e.target.value.replace(/[^0-9]/g, '');
                      let num = Number(newMax);

                      const MAX_INT = 2147483647;
                      if (num > MAX_INT) {
                        num = MAX_INT;
                      }
                      if (num < 0) {
                        num = 0;
                      }

                      newMax = String(num);

                      setPriceRange(prev => {
                        const newRange = { ...prev, max: newMax };

                        if (newMax && prev.min) {
                          const minNum = Number(prev.min);
                          const maxNum = Number(newMax);
                          if (minNum > maxNum) {
                            setPriceError('최소 금액은 최대 금액보다 클 수 없습니다.');
                          } else {
                            setPriceError('');
                          }
                        } else {
                          setPriceError('');
                        }

                        return newRange;
                      });
                    }}
                   onBlur={() => handlePriceBlur('max')}
                   className="flex-1 px-2 py-2 text-xs text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: priceError ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                   }}
                 />
               </div>
               {priceError && (
                 <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
                   <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                   </svg>
                   <span className="font-medium flex-1">{priceError}</span>
                   <button
                     type="button"
                     onClick={() => setPriceError('')}
                     className="text-current opacity-70 hover:opacity-100 transition-opacity"
                   >
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                   </button>
                 </div>
               )}
             </div>

             {/* 카테고리 */}
             <div className="space-y-3 relative">
               <h3 className="text-base font-semibold text-gray-900">카테고리</h3>
               
               <button
                 onClick={() => setShowCategoryPopover(!showCategoryPopover)}
                 className="w-full px-4 py-3 text-left text-sm text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis rounded-xl transition-all duration-300 hover:shadow-lg"
                 style={{ 
                   background: 'rgba(255, 255, 255, 0.7)',
                   backdropFilter: 'blur(20px)',
                   border: '1.5px solid rgba(255, 255, 255, 0.4)',
                   boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                 }}
               >
                 {getSelectedCategoriesText()}
               </button>

              {showCategoryPopover && (
                <div className="lg:hidden absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50" style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(25px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 20px 40px rgba(31, 38, 135, 0.2)',
                  maxHeight: '400px'
                }}>
                  <div className="flex" style={{ height: '320px' }}>
                    {/* 상위 카테고리 */}
                    <div className="w-1/2 overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                      {isCategoriesLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">카테고리 로딩 중...</div>
                      ) : categories.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">카테고리가 없습니다</div>
                      ) : (
                        categories.map(category => (
                          <button
                            key={category.categoryId}
                            onClick={() => setActiveCategoryId(category.categoryId)}
                            className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                             activeCategoryId === category.categoryId
                               ? 'bg-gray-900 text-white border-r-2 border-gray-900'
                               : 'hover:bg-gray-50'
                           }`}
                          >
                            <span className={`text-sm font-medium ${activeCategoryId === category.categoryId ? 'text-white' : 'text-gray-800'}`}>{category.categoryName}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {/* 하위 카테고리 */}
                    <div className="w-1/2 overflow-y-auto scrollbar-hide">
                      {categories.find(c => c.categoryId === activeCategoryId)?.children?.map((sub) => (
                        <button
                          key={sub.categoryId}
                          onClick={() => toggleSubcategory(sub)}
                          className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                           selectedSubcategories.some(s => s.categoryId === sub.categoryId)
                             ? 'bg-gray-900 text-white border border-gray-900'
                             : 'hover:bg-gray-50'
                         }`}
                        >
                          <span className={`text-sm font-medium ${selectedSubcategories.some(s => s.categoryId === sub.categoryId) ? 'text-white' : 'text-gray-800'}`}>{sub.categoryName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <button 
                      onClick={() => setShowCategoryPopover(false)}
                      className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                    >
                      선택 완료
                    </button>
                  </div>
                </div>
              )}

               {/* 선택된 하위 카테고리 표시 */}
               {selectedSubcategories.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-2">
                   {selectedSubcategories.map((sub, idx) => (
                     <span
                       key={idx}
                       className="inline-flex items-center px-3 py-1 bg-white/20 text-gray-700 text-sm rounded-full border border-white/30"
                     >
                       {sub.categoryName}
                       <button
                         onClick={() => removeSubcategory(sub)}
                         className="ml-2 text-gray-600 hover:text-gray-800"
                       >
                         ×
                       </button>
                     </span>
                   ))}
                 </div>
               )}
             </div>

             {/* 지역 (시 → 구 → 동) */}
            <div className="space-y-3 relative">
              <h3 className="text-base font-semibold text-gray-900">지역 (시 · 구 · 동)</h3>

              <button
                type="button"
                onClick={() => setShowRegionPopover(!showRegionPopover)}
                className="w-full px-4 py-3 text-left text-sm text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis rounded-xl transition-all duration-300 hover:shadow-lg"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                }}
              >
                {selectedRegionName || '지역을 선택하세요'}
              </button>

              {showRegionPopover && (
                <div className="lg:hidden absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50" style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(25px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 20px 40px rgba(31, 38, 135, 0.2)',
                  maxHeight: '310px'
                }}>
                  <div className="flex" style={{ height: '240px' }}>
                    {/* 시/도 */}
                    <div className="w-1/3 overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                      {isSidosLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">로딩 중...</div>
                      ) : sidos.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">시/도가 없습니다</div>
                      ) : (
                        sidos.map((sido) => (
                          <button
                            key={sido.sidoId || sido.id}
                            type="button"
                            onClick={() => {
                              setActiveSidoId(sido.sidoId || sido.id);
                              setActiveGunguId(null);
                              setSelectedSido(sido);
                              setSelectedGungu(null);
                              setSelectedDong(null);
                            }}
                            className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                              activeSidoId === (sido.sidoId || sido.id)
                                ? 'bg-gray-900 text-white border-r-2 border-gray-900'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className={`text-sm font-medium ${activeSidoId === (sido.sidoId || sido.id) ? 'text-white' : 'text-gray-800'}`}>{sido.sidoName || sido.name}</span>
                          </button>
                        ))
                      )}
                    </div>

                    {/* 구/군 */}
                    <div className="w-1/3 overflow-y-auto scrollbar-hide">
                      {!activeSidoId ? null : isGungusLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">로딩 중...</div>
                      ) : gungus.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">구·군이 없습니다</div>
                      ) : (
                        gungus.map((gungu) => (
                          <button
                            key={gungu.gunguId || gungu.id}
                            type="button"
                            onClick={() => {
                              setActiveGunguId(gungu.gunguId || gungu.id);
                              setSelectedGungu(gungu);
                              setSelectedDong(null);
                            }}
                            className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                              activeGunguId === (gungu.gunguId || gungu.id)
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className={`text-sm font-medium ${activeGunguId === (gungu.gunguId || gungu.id) ? 'text-white' : 'text-gray-800'}`}>{gungu.gunguName || gungu.name}</span>
                          </button>
                        ))
                      )}
                    </div>

                    {/* 동 */}
                    <div className="w-1/3 overflow-y-auto scrollbar-hide">
                      {!activeGunguId ? null : isDongsLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">로딩 중...</div>
                      ) : dongs.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">동이 없습니다</div>
                      ) : (
                        dongs.map((dong) => (
                          <button
                            key={dong.dongId || dong.id}
                            type="button"
                            onClick={() => {
                              setSelectedDong(dong);
                            }}
                            className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                              selectedDong?.dongId === (dong.dongId || dong.id) || selectedDong?.id === (dong.dongId || dong.id)
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className={`text-sm font-medium ${(selectedDong?.dongId === (dong.dongId || dong.id) || selectedDong?.id === (dong.dongId || dong.id)) ? 'text-white' : 'text-gray-800'}`}>{dong.dongName || dong.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="p-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <button 
                      type="button"
                      onClick={() => {
                        let finalName = "";

                        if (selectedDong) {
                          finalName = `${selectedSido?.sidoName || selectedSido?.name} ${selectedGungu?.gunguName || selectedGungu?.name} ${selectedDong?.dongName || selectedDong?.name}`;
                        } else if (selectedGungu) {
                          finalName = `${selectedSido?.sidoName || selectedSido?.name} ${selectedGungu?.gunguName || selectedGungu?.name}`;
                        } else if (selectedSido) {
                          finalName = `${selectedSido?.sidoName || selectedSido?.name}`;
                        }

                        setSelectedRegionName(finalName);
                        setShowRegionPopover(false);
                    }}
                      className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                    >
                      선택 완료
                    </button>
                  </div>
                </div>
              )}
            </div>

             {/* 최소 평점 */}
             <div className="space-y-3">
               <h3 className="text-base font-semibold text-gray-900">최소 평점</h3>
               
               <div className="flex justify-center gap-2 py-2">
                 {[1, 2, 3, 4, 5].map(star => {
                   const isFull = rating >= star;
                   const isHalf = rating === star - 0.5;
                   return (
                     <button
                       key={star}
                       onClick={(e) => handleStarClick(e, star)}
                       className="relative transition-transform duration-200 hover:scale-110"
                       style={{ width: '32px', height: '32px' }}
                     >
                       <svg
                         width="32"
                         height="32"
                         viewBox="0 0 24 24"
                         fill={isHalf ? `url(#gradient-${star})` : isFull ? '#FFD700' : '#E5E7EB'}
                         stroke={isFull || isHalf ? '#FFD700' : '#D1D5DB'}
                         strokeWidth="1"
                       >
                         <defs>
                           <linearGradient id={`gradient-${star}`} x1="0%" y1="0%" x2="100%" y2="0%">
                             <stop offset="50%" stopColor="#FFD700" />
                             <stop offset="50%" stopColor="#E5E7EB" />
                           </linearGradient>
                         </defs>
                         <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                       </svg>
                     </button>
                   );
                 })}
               </div>

               {rating > 0 && (
                 <div className="text-center">
                   <div className="text-sm font-bold text-gray-900">
                     {rating}점 이상
                   </div>
                   <button
                     onClick={() => setRating(0)}
                     className="text-xs mt-1 text-gray-700 hover:text-gray-900 transition-opacity duration-200 hover:opacity-70"
                   >
                     평점 초기화
                   </button>
                 </div>
               )}
             </div>

             {/* 당일 대여 */}
             <div className="space-y-3">
               <h3 className="text-base font-semibold text-gray-900">당일 대여 가능</h3>
               
               <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-300" style={{ 
                 background: 'rgba(255, 255, 255, 0.7)',
                 backdropFilter: 'blur(20px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.4)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 <span className="text-sm font-medium text-gray-800">당일 대여 가능한 상품만 보기</span>
                 <button
                   onClick={() => setSameDayRental(!sameDayRental)}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                     sameDayRental ? 'bg-gray-900' : 'bg-gray-200'
                   }`}
                 >
                   <span
                     className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                       sameDayRental ? 'translate-x-6' : 'translate-x-1'
                     }`}
                   />
                 </button>
               </div>
             </div>

             {/* 필터 버튼들 */}
             <div className="mt-6 space-y-2">
               <button
                 onClick={handleReset}
                 className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 hover:shadow-lg"
                 style={{ 
                   background: 'rgba(255, 255, 255, 0.7)',
                   backdropFilter: 'blur(20px)',
                   border: '1.5px solid rgba(255, 255, 255, 0.4)',
                   color: '#6B7280',
                   boxShadow: '0 4px 16px rgba(31, 38, 135, 0.1)'
                 }}
               >
                 초기화
               </button>
               <button
                 onClick={() => {
                   handleApply();
                   setIsFilterOpen(false);
                 }}
                 className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                 style={{ 
                   background: 'linear-gradient(135deg, #1f2937, #111827)',
                   boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                 }}
               >
                 필터 적용
               </button>
             </div>
           </div>
         </div>
       </div>
     )}

    {/* 플로팅 상품 등록 버튼 - 데스크톱만 */}
    <button
      onClick={() => setShowCreateModal(true)}
      className="hidden lg:flex fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 hover:bg-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 items-center justify-center"
    >
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>

     {/* 상품 등록 확인 모달 */}
     {showCreateModal && (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <div 
           className="absolute inset-0 bg-black/50" 
           onClick={() => setShowCreateModal(false)}
         />
         <div className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
           <div className="text-center">
             <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
             </div>
             
             <h3 className="text-xl font-bold text-gray-900 mb-2">새로 등록하시겠습니까?</h3>
             <p className="text-gray-600 mb-6">새로운 상품을 등록하여 다른 사용자들과 공유해보세요.</p>
             
             <div className="flex gap-3">
               <button
                 onClick={() => setShowCreateModal(false)}
                 className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
               >
                 취소
               </button>
               <button
                 onClick={handleCreateProduct}
                 className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium"
               >
                 새로 등록
               </button>
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default ProductListMain;
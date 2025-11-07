import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../../mypage/components/ProductCard';
import HashtagFilter from '../components/HashtagFilter';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { PRODUCT_TYPES } from '../../../shared/constants/dummyData';
import { ROUTE_PATHS } from '../../../shared/constants/routePaths';
import { useAuth, kakaoLogin } from '@/features/auth';
import { useProducts } from '../hooks/useProducts';
import { useSearch } from '../../search/hooks/useSearch';
import { useCategoryTree } from '@/features/category';
import { useSearchParams } from 'react-router-dom';

const SEOUL_DISTRICTS = [
  { id: 'gangnam', name: '강남구', areas: ['역삼동', '개포동', '청담동', '삼성동'] },
  { id: 'gangdong', name: '강동구', areas: ['천호동', '성내동', '길동', '둔촌동'] },
  { id: 'gangbuk', name: '강북구', areas: ['미아동', '번동', '수유동', '우이동'] },
  { id: 'gangseo', name: '강서구', areas: ['염창동', '등촌동', '화곡동', '가양동'] },
  { id: 'gwanak', name: '관악구', areas: ['신림동', '봉천동', '남현동', '서원동'] },
  { id: 'gwangjin', name: '광진구', areas: ['구의동', '광장동', '자양동', '화양동'] },
  { id: 'guro', name: '구로구', areas: ['구로동', '가리봉동', '신도림동', '고척동'] },
  { id: 'nowon', name: '노원구', areas: ['상계동', '중계동', '하계동', '공릉동'] },
  { id: 'dobong', name: '도봉구', areas: ['쌍문동', '방학동', '창동', '도봉동'] },
  { id: 'dongdaemun', name: '동대문구', areas: ['용신동', '제기동', '전농동', '답십리동'] },
  { id: 'dongjak', name: '동작구', areas: ['노량진동', '상도동', '사당동', '대방동'] },
  { id: 'mapo', name: '마포구', areas: ['공덕동', '아현동', '도화동', '용강동'] },
  { id: 'seodaemun', name: '서대문구', areas: ['충현동', '천연동', '신촌동', '연희동'] },
  { id: 'seocho', name: '서초구', areas: ['방배동', '양재동', '내곡동', '원지동'] },
  { id: 'seongdong', name: '성동구', areas: ['왕십리동', '마장동', '사근동', '행당동'] },
  { id: 'seongbuk', name: '성북구', areas: ['성북동', '삼선동', '동선동', '돈암동'] },
  { id: 'songpa', name: '송파구', areas: ['잠실동', '문정동', '장지동', '방이동'] },
  { id: 'yangcheon', name: '양천구', areas: ['목동', '신월동', '신정동', '염창동'] },
  { id: 'yeongdeungpo', name: '영등포구', areas: ['여의도동', '당산동', '도림동', '문래동'] },
  { id: 'yongsan', name: '용산구', areas: ['남영동', '원효로동', '이촌동', '한강로동'] },
  { id: 'eunpyeong', name: '은평구', areas: ['수색동', '녹번동', '불광동', '갈현동'] },
  { id: 'jongno', name: '종로구', areas: ['청운동', '신교동', '궁정동', '효자동'] },
  { id: 'jung', name: '중구', areas: ['소공동', '회현동', '명동', '필동'] },
  { id: 'jungnang', name: '중랑구', areas: ['면목동', '상봉동', '중화동', '망우동'] }
];

const ProductListMain = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // 사이드 네비게이션 상태
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  
  // 필터 상태
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
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [rating, setRating] = useState(0);
  const [sameDayRental, setSameDayRental] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const q = searchParams.get('q') || '';

  React.useEffect(() => {
    if (q) {
      setSearchQuery(q);
    }
  }, [q]);

  React.useEffect(() => {
    // 컴포넌트 처음 마운트 시 한 번 실행
    refetch();
  }, []);
  
  // 카테고리 API 조회
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategoryTree();
  
  // 카테고리 로드 후 첫 번째 카테고리 자동 선택
  React.useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].categoryId);
    }
  }, [categories, activeCategoryId]);

  // API 필터 파라미터 생성
  const apiFilters = useMemo(() => ({
    uploadType: activeTab, // 'rent' 또는 'borrow'
    q: searchQuery,
    category: selectedSubcategories.length > 0 ? selectedSubcategories[0] : '',
    "price-min": priceRange.min ? parseInt(priceRange.min.toString().replace(/,/g, ''), 10) : null,
    "price-max": priceRange.max ? parseInt(priceRange.max.toString().replace(/,/g, ''), 10) : null,
    location: selectedAreas.length > 0 ? selectedAreas[0] : '',
    rating: rating,
    sameDayRental: sameDayRental,
    hashtag: selectedHashtags.map(h => h.name),
    "date-from": selectedDates.start ? selectedDates.start.toISOString() : null,
    "date-to": selectedDates.end ? selectedDates.end.toISOString() : null
  }), [
    activeTab,
    searchQuery,
    selectedSubcategories,
    priceRange,
    selectedAreas,
    rating,
    sameDayRental,
    selectedHashtags,
    selectedDates
  ]);

  // React Query로 상품 데이터 가져오기
  const { searchResponses, total, hashtags, isLoading, isError, error, refetch } = useSearch(q, apiFilters);

  // 상품 목록 추출
  const products = searchResponses || [];
  const totalProducts = total || 0;

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
      setPriceRange(prev => ({ ...prev, [type]: formatPrice(value.replace(/,/g, '')) }));
    }
  };

  const toggleSubcategory = (subcategory) => {
    setSelectedSubcategories(prev => 
      prev.includes(subcategory) 
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const getSelectedCategoriesText = () => {
    if (selectedSubcategories.length === 0) return '선택하세요';
    if (selectedSubcategories.length === 1) return selectedSubcategories[0];
    return `${selectedSubcategories[0]} 외 ${selectedSubcategories.length - 1}개`;
  };

  const toggleDistrict = (districtId) => {
    setSelectedDistricts(prev => 
      prev.includes(districtId)
        ? prev.filter(d => d !== districtId)
        : [...prev, districtId]
    );
  };

  const toggleArea = (area) => {
    setSelectedAreas(prev => 
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const handleStarClick = (e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setRating(newRating);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedDates({ start: null, end: null });
    setPriceRange({ min: '', max: '' });
    setSelectedSubcategories([]);
    setSelectedDistricts([]);
    setSelectedAreas([]);
    setRating(0);
    setSameDayRental(false);
  };

  const handleHashtagSelect = (hashtag, isRemove = false) => {
    if (isRemove) {
      setSelectedHashtags(prev => prev.filter(h => h.id !== hashtag.id));
    } else {
      const isAlreadySelected = selectedHashtags.some(h => h.id === hashtag.id);
      if (!isAlreadySelected) {
        setSelectedHashtags(prev => [...prev, hashtag]);
      }
    }
  };

  const handleApply = async () => {
    console.log('Applied filters:', {
      searchQuery,
      dateRange: selectedDates,
      priceRange,
      subcategories: selectedSubcategories,
      districts: selectedDistricts,
      areas: selectedAreas,
      rating,
      sameDayRental,
      hashtags: selectedHashtags
    });
    try {
      await refetch(); // ✅ 수동으로 /search 요청
    } catch (err) {
      console.error('검색 실패:', err);
    }
    handleCloseFilter();
  };

  const handleCloseFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300); // 애니메이션 시간과 동일 (0.3s)
  };

  const handleCreateProduct = () => {
    navigate(ROUTE_PATHS.PRODUCT_CREATE);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* 우측 상단 프로필/로그인 버튼 - 데스크톱 */}
      <div className="hidden lg:flex fixed top-4 right-4 z-[100] items-center gap-4">
        {isAuthenticated ? (
          // 로그인 상태: 원형 프로필 버튼
          <button
            onClick={() => setIsSideNavOpen(!isSideNavOpen)}
            className="group relative w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50"
            title={user?.nickname || '프로필'}
          >
            {user?.nickname?.charAt(0) || '👤'}
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
               빌려줘
             </button>
             <button
               onClick={() => setActiveTab('borrow')}
               className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                 activeTab === 'borrow'
                   ? 'bg-gray-900 text-white shadow-sm'
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               구해요
             </button>
           </div>
          </div>
        {/* 검색창 */}
        <div className="relative">
          <input
            type="text"
            placeholder="상품 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          />
          <svg 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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

         {/* 가격 범위 */}
         <div className="space-y-3">
           <h3 className="text-base font-extrabold text-gray-900">가격 범위</h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="최소 금액"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value.replace(/[^0-9]/g, '') }))}
              onBlur={() => handlePriceBlur('min')}
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 overflow-hidden text-ellipsis rounded-xl transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
            <input
              type="text"
              placeholder="최대 금액"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value.replace(/[^0-9]/g, '') }))}
              onBlur={() => handlePriceBlur('max')}
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 overflow-hidden text-ellipsis rounded-xl transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
          </div>
        </div>

         {/* 카테고리 */}
         <div className="space-y-3 relative">
           <h3 className="text-base font-semibold text-gray-900">카테고리</h3>
          
          <button
            onClick={() => setShowCategoryPopover(!showCategoryPopover)}
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

          {showCategoryPopover && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-30" style={{ 
              maxWidth: '95%', 
              height: '350px',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
             <div className="flex" style={{ height: 'calc(100% - 60px)' }}>
               {/* 상위 카테고리 */}
               <div className="w-2/5 overflow-y-auto scrollbar-hide bg-gray-50" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
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
                            ? 'bg-white font-medium text-gray-900 border-l-2 border-gray-900'
                            : 'text-gray-600 hover:bg-white/50'
                        }`}
                      >
                        {category.categoryName}
                      </button>
                    ))
                  )}
                </div>

                 {/* 하위 카테고리 */}
                 <div className="w-3/5 overflow-y-auto scrollbar-hide p-2">
                  <div className="grid grid-cols-1 gap-1">
                    {categories.find(c => c.categoryId === activeCategoryId)?.children?.map((sub) => (
                      <button
                        key={sub.categoryId}
                        onClick={() => toggleSubcategory(sub.categoryName)}
                        className={`w-full text-left py-2 px-3 rounded-md text-xs transition-all duration-200 flex items-center justify-between ${
                          selectedSubcategories.includes(sub.categoryName)
                            ? 'bg-gray-900 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="leading-tight">{sub.categoryName}</span>
                        {selectedSubcategories.includes(sub.categoryName) && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-[60px] p-3 bg-white" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <button
                  onClick={() => setShowCategoryPopover(false)}
                  className="w-full h-full rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-black transition-colors"
                >
                  선택 완료 ({selectedSubcategories.length})
                </button>
              </div>
            </div>
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
                  <span className="truncate">{sub}</span>
                  <button
                    onClick={() => toggleSubcategory(sub)}
                    className="flex-shrink-0 transition-opacity duration-200 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

         {/* 지역 (구 → 동) */}
         <div className="space-y-3">
           <h3 className="text-base font-semibold text-gray-900">지역 (구 · 동)</h3>
          
           {/* 구 선택 */}
           <div className="max-h-48 overflow-y-auto scrollbar-hide p-3 rounded-xl space-y-2" style={{ 
             background: 'rgba(255, 255, 255, 0.7)',
             backdropFilter: 'blur(20px)',
             border: '1.5px solid rgba(255, 255, 255, 0.4)',
             boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
           }}>
             {SEOUL_DISTRICTS.map(district => (
               <button
                 key={district.id}
                 onClick={() => toggleDistrict(district.id)}
                 className={`w-full text-left px-2 py-1.5 rounded-lg transition-all duration-200 ${
                   selectedDistricts.includes(district.id)
                     ? 'bg-gray-900 text-white border border-gray-900'
                     : 'hover:bg-white/60 text-gray-800'
                 }`}
               >
                 <span className={`text-sm ${selectedDistricts.includes(district.id) ? 'text-white' : 'text-gray-800'}`}>{district.name}</span>
               </button>
             ))}
           </div>

          {/* 선택된 구의 동 선택 */}
          {selectedDistricts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>동 선택</h4>
               <div className="max-h-40 overflow-y-auto scrollbar-hide p-3 rounded-xl space-y-2" style={{ 
                 background: 'rgba(255, 255, 255, 0.7)',
                 backdropFilter: 'blur(20px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.4)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 {selectedDistricts.map(districtId => {
                   const district = SEOUL_DISTRICTS.find(d => d.id === districtId);
                   return district ? (
                     <div key={districtId} className="space-y-1">
                       <div className="text-xs font-semibold px-2 text-gray-900">{district.name}</div>
                       <div className="grid grid-cols-2 gap-1">
                         {district.areas.map((area, idx) => (
                           <button
                             key={idx}
                             onClick={() => toggleArea(area)}
                             className={`w-full text-left px-2 py-1 rounded-lg transition-all duration-200 ${
                               selectedAreas.includes(area)
                                 ? 'bg-gray-900 text-white border border-gray-900'
                                 : 'hover:bg-white/50 text-gray-800'
                             }`}
                           >
                             <span className={`text-xs ${selectedAreas.includes(area) ? 'text-white' : 'text-gray-800'}`}>{area}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                   ) : null;
                 })}
               </div>
            </div>
          )}

          {selectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-hidden">
              {selectedAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-all duration-200"
                   style={{ 
                     background: 'rgba(17, 24, 39, 0.08)',
                     color: '#111827',
                     border: '1px solid rgba(17, 24, 39, 0.2)',
                     backdropFilter: 'blur(10px)'
                   }}
                >
                  {area}
                  <button
                    onClick={() => toggleArea(area)}
                    className="transition-opacity duration-200 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
                     빌려줘
                   </span>
                 </div>
                 <div className="w-1/2 flex items-center justify-center">
                   <span className={`text-xs font-bold transition-colors duration-300 ${activeTab === 'borrow' ? 'text-white' : 'text-gray-600'}`}>
                     구해요
                   </span>
                 </div>
               </div>
             </button>
           </div>
           
           {/* 모바일 우측 버튼 그룹 */}
           <div className="flex items-center gap-2">
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
                className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-300 ring-2 ring-white/30"
                title={user?.nickname || '프로필'}
              >
                {user?.nickname?.charAt(0) || '👤'}
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

      {/* 해시태그 필터 - 스티키 */}
      <div className="sticky top-0 z-10 pt-4 lg:pt-16 pb-4 px-4 bg-white border-b border-gray-200">
        <HashtagFilter 
          onHashtagSelect={handleHashtagSelect}
          selectedHashtags={selectedHashtags}
        />
      </div>

       {/* 상품 목록 */}
       <div className="flex-1 p-6 overflow-y-auto">
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
         {!isLoading && !isError && products.length > 0 && (
           <>
             <div className="mb-4 flex items-center justify-between">
               <p className="text-sm text-gray-600">
                 총 <span className="font-semibold text-gray-900">{totalProducts}</span>개의 상품
               </p>
             </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard
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
           </>
         )}

         {/* 빈 상태 */}
         {!isLoading && !isError && products.length === 0 && (
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
     <div className={`fixed inset-0 z-50 lg:hidden ${isFilterClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
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
                   빌려줘
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
                   구해요
                 </button>
               </div>
             </div>

             {/* 해시태그 필터 */}
             <HashtagFilter 
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
                 className="w-full px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder-gray-400 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2"
                 style={{ 
                   background: 'rgba(255, 255, 255, 0.8)',
                   backdropFilter: 'blur(20px)',
                   border: '1.5px solid rgba(255, 255, 255, 0.6)',
                   boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.5)',
                   '--tw-ring-color': 'rgb(59 130 246 / 0.3)'
                 }}
               />
               <svg 
                 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                 fill="none" 
                 stroke="currentColor" 
                 viewBox="0 0 24 24"
               >
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
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
                   onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value.replace(/[^0-9]/g, '') }))}
                   onBlur={() => handlePriceBlur('min')}
                   className="flex-1 px-2 py-2 text-xs text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)',
                     '--tw-ring-color': 'rgb(59 130 246 / 0.3)'
                   }}
                 />
                 <input
                   type="text"
                   placeholder="최대 금액"
                   value={priceRange.max}
                   onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value.replace(/[^0-9]/g, '') }))}
                   onBlur={() => handlePriceBlur('max')}
                   className="flex-1 px-2 py-2 text-xs text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                   }}
                 />
               </div>
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
                <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50" style={{ 
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
                    <div className="w-1/2 overflow-y-auto scrollbar-hide p-3">
                      {categories.find(c => c.categoryId === activeCategoryId)?.children?.map((sub) => (
                        <button
                          key={sub.categoryId}
                          onClick={() => toggleSubcategory(sub.categoryName)}
                          className={`w-full text-left py-2 px-2 rounded transition-all duration-200 ${
                           selectedSubcategories.includes(sub.categoryName)
                             ? 'bg-gray-900 text-white border border-gray-900'
                             : 'hover:bg-gray-50'
                         }`}
                        >
                          <span className={`text-xs leading-tight ${selectedSubcategories.includes(sub.categoryName) ? 'text-white' : 'text-gray-800'}`}>{sub.categoryName}</span>
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
                       {sub}
                       <button
                         onClick={() => toggleSubcategory(sub)}
                         className="ml-2 text-gray-600 hover:text-gray-800"
                       >
                         ×
                       </button>
                     </span>
                   ))}
                 </div>
               )}
             </div>

             {/* 지역 (구 → 동) */}
             <div className="space-y-3">
               <h3 className="text-base font-semibold text-gray-900">지역 (구 · 동)</h3>
               
               {/* 구 선택 */}
               <div className="max-h-48 overflow-y-auto scrollbar-hide p-3 rounded-xl space-y-2" style={{ 
                 background: 'rgba(255, 255, 255, 0.7)',
                 backdropFilter: 'blur(20px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.4)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 {SEOUL_DISTRICTS.map(district => (
                   <button
                     key={district.id}
                     onClick={() => toggleDistrict(district.id)}
                     className={`w-full text-left px-2 py-1.5 rounded-lg transition-all duration-200 ${
                      selectedDistricts.includes(district.id)
                        ? 'bg-gray-900 text-white border border-gray-900'
                        : 'hover:bg-white/60 text-gray-800'
                    }`}
                   >
                     <span className={`text-sm ${selectedDistricts.includes(district.id) ? 'text-white' : 'text-gray-800'}`}>{district.name}</span>
                   </button>
                 ))}
               </div>

               {/* 선택된 구의 동 선택 */}
               {selectedDistricts.length > 0 && (
                 <div className="space-y-2">
                   <h4 className="text-sm font-medium text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>동 선택</h4>
                   <div className="max-h-40 overflow-y-auto scrollbar-hide p-3 rounded-xl space-y-2" style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                   }}>
                     {selectedDistricts.map(districtId => {
                       const district = SEOUL_DISTRICTS.find(d => d.id === districtId);
                       return district ? (
                         <div key={districtId} className="space-y-1">
                           <div className="text-xs font-semibold px-2 text-gray-900">{district.name}</div>
                           <div className="grid grid-cols-2 gap-1">
                             {district.areas.map((area, idx) => (
                               <button
                                 key={idx}
                                 onClick={() => toggleArea(area)}
                                className={`w-full text-left px-2 py-1 rounded-lg transition-all duration-200 ${
                                  selectedAreas.includes(area)
                                    ? 'bg-gray-900 text-white border border-gray-900'
                                    : 'hover:bg-white/50 text-gray-800'
                                }`}
                               >
                                 <span className={`text-xs ${selectedAreas.includes(area) ? 'text-white' : 'text-gray-800'}`}>{area}</span>
                               </button>
                             ))}
                           </div>
                         </div>
                       ) : null;
                     })}
                   </div>
                 </div>
               )}

               {/* 선택된 동 표시 */}
               {selectedAreas.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-2">
                   {selectedAreas.map((area, idx) => (
                     <span
                       key={idx}
                       className="inline-flex items-center px-3 py-1 bg-white/20 text-gray-700 text-sm rounded-full border border-white/30"
                     >
                       {area}
                       <button
                         onClick={() => toggleArea(area)}
                         className="ml-2 text-gray-600 hover:text-gray-800"
                       >
                         ×
                       </button>
                     </span>
                   ))}
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

    {/* 플로팅 상품 등록 버튼 */}
    <button
      onClick={() => setShowCreateModal(true)}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 hover:bg-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
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
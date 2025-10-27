import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../../mypage/components/ProductCard';
import HashtagFilter from '../components/HashtagFilter';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { DUMMY_PRODUCTS } from '../../../shared/constants/dummyData';

const CATEGORIES = [
  { id: 1, name: "게임 / 오락", children: ["콘솔 (닌텐도 스위치, PS5, Xbox)", "보드게임", "오락기 / 아케이드 머신", "VR 기기 (Meta Quest, PS VR)", "게임 컨트롤러 / 조이스틱", "게임 타이틀 (소프트웨어)"] },
  { id: 2, name: "촬영 / 영상", children: ["카메라 (DSLR, 미러리스, 필름)", "캠코더", "액션캠 (고프로, DJI Osmo)", "삼각대 / 짐벌 / 스테디캠", "조명 / 소프트박스", "드론 (항공촬영용)", "마이크 / 오디오레코더", "촬영 소품 (배경천, 반사판 등)"] },
  { id: 3, name: "음악 / 악기", children: ["기타 (통기타, 일렉기타)", "피아노 / 키보드", "바이올린 / 첼로", "드럼 / 전자드럼", "마이크 / 오디오 인터페이스", "앰프 / 스피커", "DJ 장비 / 믹서"] },
  { id: 4, name: "미술 / 공예", children: ["캔버스 / 도화지 / 붓세트", "아크릴 / 수채화 물감", "조소 도구 / 점토", "미술용 이젤 / 작업대", "3D 펜 / 레진 공예 도구", "목공 공구 (톱, 사포, 전동드릴)", "DIY 키트 (모형 만들기, 비즈공예 등)"] },
  { id: 5, name: "독서 / 글쓰기", children: ["자기계발 / 경제서", "소설 / 에세이 / 시집", "전문서적 (IT, 디자인, 경영 등)", "독서 조명 / 독서대", "전자책 리더기 (Kindle, 리디페이퍼)", "필기구 / 노트세트"] },
  { id: 6, name: "요리 / 제과제빵", children: ["오븐 / 에어프라이어 / 전자레인지", "믹서기 / 블렌더 / 푸드프로세서", "빵틀 / 케이크 몰드", "커피 머신 / 드립 세트", "캠핑용 버너 / 코펠세트", "아이스크림 제조기 / 젤라또 머신", "주방 저울 / 계량컵 세트"] },
  { id: 7, name: "스포츠 / 피트니스", children: ["자전거 / MTB", "헬스 기구 (덤벨, 요가매트, 폼롤러)", "러닝화 / 트레이닝복", "인라인 / 킥보드 / 전동스쿠터", "캠핑용 의자 / 테이블", "낚싯대 / 낚시 장비", "배드민턴 / 테니스 라켓", "스키 / 스노보드 / 부츠", "축구공 / 농구공 / 배구공", "수영용품 (오리발, 고글, 수영복)"] },
  { id: 8, name: "공연 / 연기 / 무대", children: ["의상 / 코스튬 / 소품", "무대 조명 / 스탠드", "무선마이크 / 스피커", "스모그 머신 / 조명 필터", "대본 / 악보 스탠드"] },
  { id: 9, name: "영상 편집 / 디자인", children: ["노트북 (영상편집용)", "그래픽 태블릿", "외장 SSD / 메모리카드", "편집용 모니터", "프리미어 / 애프터이펙트 단축키 키보드", "컬러 캘리브레이터"] },
  { id: 10, name: "캠핑 / 여행", children: ["텐트 / 타프", "캠핑 의자 / 테이블", "랜턴 / 조명", "침낭 / 매트 / 에어베드", "휴대용 버너 / 코펠", "아이스박스 / 쿨러", "캠핑용 전기장비 (히터, 선풍기)", "카라반 / 캠핑카", "여행용 캐리어 / 가방"] },
  { id: 11, name: "레저 / 액티비티", children: ["서핑보드 / 웻수트", "카약 / 패들보트", "스쿠버다이빙 장비", "패러글라이딩 장비", "인라인 / 롤러", "스케이트보드 / 롱보드"] },
  { id: 12, name: "패션 / 스타일", children: ["정장 / 드레스", "구두 / 하이힐", "한복 / 전통의상", "코스튬 / 캐릭터복", "가방 / 시계 / 악세서리", "패션촬영용 소품"] },
  { id: 13, name: "교육 / 학습", children: ["전자칠판 / 빔프로젝터", "학습용 태블릿 / 노트북", "학습교재 / 문제집", "VR 교육기기", "마이크로비트 / 라즈베리파이 키트"] },
  { id: 14, name: "아웃도어 / 여행용품", children: ["카라반용 장비 / 휴대 발전기", "차량용 냉장고", "트렁크 정리함 / 루프박스", "자외선 차단 텐트", "접이식 자전거"] },
  { id: 15, name: "힐링", children: ["아로마 디퓨저 / 향초", "마사지건 / 안마기", "퍼즐 / 조립 블록", "수공예 키트 (뜨개질, 십자수)", "화분 / 식물 키트", "반려동물용 카메라 / 장난감"] }
];

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
  const [activeTab, setActiveTab] = useState('lend');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(1);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [rating, setRating] = useState(0);
  const [sameDayRental, setSameDayRental] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);

  // 더미 데이터 사용
  const products = DUMMY_PRODUCTS;

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
    const startStr = selectedDates.start.toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1);
    if (!selectedDates.end) return startStr;
    const endStr = selectedDates.end.toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1);
    const daysDiff = Math.ceil((selectedDates.end - selectedDates.start) / (1000 * 60 * 60 * 24)) + 1;
    return `${startStr} ~ ${endStr} (총 ${daysDiff}일)`;
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

  const handleApply = () => {
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
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNavbar />
      {/* 데스크톱 필터 사이드바 */}
      <div className="hidden lg:block w-1/4 h-screen overflow-y-auto sticky top-0 scrollbar-hide" style={{ 
        background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.95), rgba(243, 244, 246, 0.9))',
        backdropFilter: 'blur(30px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <div className="p-6 space-y-6">
          
          {/* 빌려요/구해요 탭 */}
          <div className="mb-6">
            <div className="flex space-x-2 p-1 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
            }}>
              <button
                onClick={() => setActiveTab('lend')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                  activeTab === 'lend'
                    ? 'text-gray-800 shadow-md'
                    : 'text-gray-600 hover:bg-white/10'
                }`}
                style={activeTab === 'lend' ? {
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 16px rgba(31, 38, 135, 0.2)'
                } : {}}
              >
                빌려줘
              </button>
              <button
                onClick={() => setActiveTab('borrow')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                  activeTab === 'borrow'
                    ? 'text-gray-800 shadow-md'
                    : 'text-gray-600 hover:bg-white/10'
                }`}
                style={activeTab === 'borrow' ? {
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 16px rgba(31, 38, 135, 0.2)'
                } : {}}
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
           <h3 className="text-base font-extrabold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>날짜 기간</h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="시작 날짜"
              value={selectedDates.start ? selectedDates.start.toLocaleDateString('ko-KR').slice(0, -1) : ''}
              readOnly
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 cursor-pointer rounded-xl transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
            <input
              type="text"
              placeholder="종료 날짜"
              value={selectedDates.end ? selectedDates.end.toLocaleDateString('ko-KR').slice(0, -1) : ''}
              readOnly
              className="flex-1 flex-shrink min-w-0 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 cursor-pointer rounded-xl transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
              }}
            />
          </div>

           {formatDateRange() && (
             <div className="text-sm font-bold" style={{ color: 'rgb(59 130 246 / 1)' }}>
               {formatDateRange()}
             </div>
           )}

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
                     background: 'linear-gradient(135deg, #007ACC, #0056CC)',
                     boxShadow: '0 4px 12px #007ACC40'
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
           <h3 className="text-base font-extrabold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>가격 범위</h3>
          
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
           <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>카테고리</h3>
          
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
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50" style={{ 
              maxWidth: '95%', 
              height: '400px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(40px)',
              border: '1.5px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 20px 60px rgba(31, 38, 135, 0.25), inset 0 0 30px rgba(255, 255, 255, 0.7)'
            }}>
             <div className="flex h-full">
               {/* 상위 카테고리 */}
               <div className="w-1/2 overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategoryId(category.id)}
                      className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 ${
                        activeCategoryId === category.id
                          ? 'font-semibold'
                          : 'text-gray-700'
                      }`}
                       style={activeCategoryId === category.id ? {
                         background: '#007ACC15',
                         color: '#007ACC',
                         borderLeft: '3px solid #007ACC'
                       } : {}}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                 {/* 하위 카테고리 */}
                 <div className="w-1/2 overflow-y-auto scrollbar-hide p-3">
                  {CATEGORIES.find(c => c.id === activeCategoryId)?.children.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleSubcategory(sub)}
                      className={`w-full text-left py-2 px-2 rounded transition-all duration-200 ${
                        selectedSubcategories.includes(sub)
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs leading-tight">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <button
                  onClick={() => setShowCategoryPopover(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:shadow-xl"
                   style={{ 
                     background: 'linear-gradient(135deg, #007ACC, #0056CC)',
                     boxShadow: '0 8px 20px #007ACC40'
                   }}
                >
                  선택 완료
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
                     background: '#007ACC15',
                     color: '#007ACC',
                     border: '1px solid #007ACC30',
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
           <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>지역 (구 · 동)</h3>
          
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
                     ? 'bg-blue-100 text-blue-800 border border-blue-300'
                     : 'hover:bg-white/60'
                 }`}
               >
                 <span className="text-sm">{district.name}</span>
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
                       <div className="text-xs font-semibold px-2" style={{ color: '#007ACC' }}>{district.name}</div>
                       <div className="grid grid-cols-2 gap-1">
                         {district.areas.map((area, idx) => (
                           <button
                             key={idx}
                             onClick={() => toggleArea(area)}
                             className={`w-full text-left px-2 py-1 rounded-lg transition-all duration-200 ${
                               selectedAreas.includes(area)
                                 ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                 : 'hover:bg-white/50'
                             }`}
                           >
                             <span className="text-xs">{area}</span>
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
                     background: '#007ACC15',
                     color: '#007ACC',
                     border: '1px solid #007ACC30',
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
           <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>최소 평점</h3>
          
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
               <div className="text-sm font-bold" style={{ color: 'rgb(59 130 246 / 1)' }}>
                 {rating}점 이상
               </div>
               <button
                 onClick={() => setRating(0)}
                 className="text-xs mt-1 transition-opacity duration-200 hover:opacity-70"
                 style={{ color: 'rgb(59 130 246 / 1)' }}
              >
                평점 초기화
              </button>
            </div>
          )}
        </div>

         {/* 당일 대여 */}
         <div className="space-y-3">
           <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>당일 대여 가능</h3>
          
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
                   ? 'linear-gradient(135deg, #007ACC, #0056CC)' 
                   : 'rgba(229, 231, 235, 0.8)',
                 backdropFilter: 'blur(10px)',
                 boxShadow: sameDayRental 
                   ? '0 4px 12px #007ACC40' 
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
      <div className="sticky bottom-0 p-4 space-y-2" style={{ 
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 -8px 32px rgba(31, 38, 135, 0.15)'
      }}>
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
          onClick={handleApply}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
           style={{ 
             background: 'linear-gradient(135deg, #007ACC, #0056CC)',
             boxShadow: '0 8px 24px #007ACC40'
           }}
        >
          필터 적용
        </button>
       </div>
     </div>


     {/* 메인 콘텐츠 영역 */}
     <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ backgroundColor: 'rgb(59 130 246 / 0.3)' }}>
       {/* 모바일 헤더 */}
       <div className="lg:hidden p-4 bg-white/20 backdrop-blur-sm border-b border-white/20">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-xl font-bold text-gray-900">
               {activeTab === 'lend' ? '빌려줘' : '구해요'}
             </h1>
           </div>
           <button
             onClick={() => setIsFilterOpen(true)}
             className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-gray-600 hover:bg-white/20 transition-colors"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
             </svg>
           </button>
         </div>
       </div>

       {/* 해시태그 필터 - 스티키 */}
       <div className="sticky top-0 z-50 p-4 border-b border-white/20" style={{ backgroundColor: 'rgb(203 214 247 / 0.82)' }}>
         <HashtagFilter 
           onHashtagSelect={handleHashtagSelect}
           selectedHashtags={selectedHashtags}
         />
       </div>

       {/* 상품 목록 */}
       <div className="p-6">
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {products.map((product) => (
             <ProductCard
               key={product.id}
               product={product}
               onClick={() => navigate(`/products/${product.id}`)}
               actionType="view"
               status={product.status}
               showStats={false}
               showDate={false}
             />
           ))}
         </div>
       </div>
     </div>

     {/* 모바일 필터 모달 */}
     {isFilterOpen && (
       <div className="fixed inset-0 z-50 lg:hidden">
         <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
         <div className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-xl rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
           <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-bold text-gray-900">필터</h2>
             <button
               onClick={() => setIsFilterOpen(false)}
               className="p-2 hover:bg-white/20 rounded-lg transition-colors"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
           
           {/* 모바일 필터 내용 - 데스크톱과 동일한 구조 */}
           <div className="space-y-6">
             {/* 빌려요/구해요 탭 */}
             <div className="mb-6">
               <div className="flex space-x-2 p-1 rounded-xl" style={{
                 background: 'rgba(255, 255, 255, 0.15)',
                 backdropFilter: 'blur(20px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.3)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 <button
                   onClick={() => setActiveTab('lend')}
                   className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                     activeTab === 'lend'
                       ? 'text-gray-800 shadow-md'
                       : 'text-gray-600 hover:bg-white/10'
                   }`}
                   style={activeTab === 'lend' ? {
                     background: 'rgba(255, 255, 255, 0.3)',
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 4px 16px rgba(31, 38, 135, 0.2)'
                   } : {}}
                 >
                   빌려줘
                 </button>
                 <button
                   onClick={() => setActiveTab('borrow')}
                   className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-center ${
                     activeTab === 'borrow'
                       ? 'text-gray-800 shadow-md'
                       : 'text-gray-600 hover:bg-white/10'
                   }`}
                   style={activeTab === 'borrow' ? {
                     background: 'rgba(255, 255, 255, 0.3)',
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 4px 16px rgba(31, 38, 135, 0.2)'
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
               <h3 className="text-base font-extrabold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>날짜 기간</h3>
               
               <div className="flex gap-2">
                 <input
                   type="text"
                   placeholder="시작 날짜"
                   value={selectedDates.start ? selectedDates.start.toLocaleDateString() : ''}
                   readOnly
                   className="flex-1 px-4 py-3 text-sm text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
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
                   placeholder="종료 날짜"
                   value={selectedDates.end ? selectedDates.end.toLocaleDateString() : ''}
                   readOnly
                   className="flex-1 px-4 py-3 text-sm text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     backdropFilter: 'blur(20px)',
                     border: '1.5px solid rgba(255, 255, 255, 0.4)',
                     boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
                   }}
                 />
               </div>

               {formatDateRange() && (
                 <div className="text-sm font-bold" style={{ color: 'rgb(59 130 246 / 1)' }}>
                   {formatDateRange()}
                 </div>
               )}

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
                             isSelected ? 'bg-[#007ACC] text-white' : ''
                           } ${
                             isInRange && !isSelected ? 'bg-[#007ACC]/30 text-[#007ACC]' : ''
                           } ${
                             !isToday && !isSelected && !isInRange ? 'hover:bg-white/50' : ''
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
               <h3 className="text-base font-extrabold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>가격 범위</h3>
               
               <div className="flex gap-2">
                 <input
                   type="text"
                   placeholder="최소 금액"
                   value={priceRange.min}
                   onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value.replace(/[^0-9]/g, '') }))}
                   onBlur={() => handlePriceBlur('min')}
                   className="flex-1 px-4 py-3 text-sm text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
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
                   className="flex-1 px-4 py-3 text-sm text-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2"
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
               <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>카테고리</h3>
               
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
                   boxShadow: '0 20px 40px rgba(31, 38, 135, 0.2)'
                 }}>
                   <div className="flex h-full">
                     {/* 상위 카테고리 */}
                     <div className="w-1/2 overflow-y-auto scrollbar-hide" style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)' }}>
                       {CATEGORIES.map(category => (
                         <button
                           key={category.id}
                           onClick={() => setActiveCategoryId(category.id)}
                           className={`w-full text-left py-3 px-4 transition-all duration-200 ${
                             activeCategoryId === category.id
                               ? 'bg-blue-100 text-blue-800 border-r-2 border-blue-500'
                               : 'hover:bg-gray-50'
                           }`}
                         >
                           <span className="text-sm font-medium text-gray-800">{category.name}</span>
                         </button>
                       ))}
                     </div>
                     {/* 하위 카테고리 */}
                     <div className="w-1/2 overflow-y-auto scrollbar-hide p-3">
                       {CATEGORIES.find(c => c.id === activeCategoryId)?.children.map((sub, idx) => (
                         <button
                           key={idx}
                           onClick={() => toggleSubcategory(sub)}
                           className={`w-full text-left py-2 px-2 rounded transition-all duration-200 ${
                             selectedSubcategories.includes(sub)
                               ? 'bg-blue-100 text-blue-800 border border-blue-300'
                               : 'hover:bg-gray-50'
                           }`}
                         >
                           <span className="text-xs leading-tight text-gray-800">{sub}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="p-3" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                     <button 
                       onClick={() => setShowCategoryPopover(false)}
                       className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
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
               <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>지역 (구 · 동)</h3>
               
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
                         ? 'bg-blue-100 text-blue-800 border border-blue-300'
                         : 'hover:bg-white/60'
                     }`}
                   >
                     <span className="text-sm text-gray-800">{district.name}</span>
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
                           <div className="text-xs font-semibold px-2" style={{ color: '#007ACC' }}>{district.name}</div>
                           <div className="grid grid-cols-2 gap-1">
                             {district.areas.map((area, idx) => (
                               <button
                                 key={idx}
                                 onClick={() => toggleArea(area)}
                                 className={`w-full text-left px-2 py-1 rounded-lg transition-all duration-200 ${
                                   selectedAreas.includes(area)
                                     ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                     : 'hover:bg-white/50'
                                 }`}
                               >
                                 <span className="text-xs text-gray-800">{area}</span>
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
               <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>최소 평점</h3>
               
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
                   <div className="text-sm font-bold" style={{ color: 'rgb(59 130 246 / 1)' }}>
                     {rating}점 이상
                   </div>
                   <button
                     onClick={() => setRating(0)}
                     className="text-xs mt-1 transition-opacity duration-200 hover:opacity-70"
                     style={{ color: 'rgb(59 130 246 / 1)' }}
                   >
                     평점 초기화
                   </button>
                 </div>
               )}
             </div>

             {/* 당일 대여 */}
             <div className="space-y-3">
               <h3 className="text-base font-semibold text-gray-800" style={{ color: 'rgb(59 130 246 / 1)' }}>당일 대여 가능</h3>
               
               <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-300" style={{ 
                 background: 'rgba(255, 255, 255, 0.7)',
                 backdropFilter: 'blur(20px)',
                 border: '1.5px solid rgba(255, 255, 255, 0.4)',
                 boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
               }}>
                 <span className="text-sm font-medium text-gray-800">당일 대여 가능한 상품만 보기</span>
                 <button
                   onClick={() => setSameDayRental(!sameDayRental)}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007ACC] focus:ring-offset-2 ${
                     sameDayRental ? 'bg-[#007ACC]' : 'bg-gray-200'
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
                   background: 'linear-gradient(135deg, #007ACC, #0056CC)',
                   boxShadow: '0 8px 24px #007ACC40'
                 }}
               >
                 필터 적용
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
/**
 * ProductCreatePage - 단계별 상품 등록 페이지
 * 화이트 베이스 + 검정 디자인
 * 좌측: 상품 상세 미리보기, 우측: 입력 폼, 하단: 진행도
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { ROUTE_PATHS } from '@/shared/constants/routePaths';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';
import { axiosInstance } from '@/lib/axios/axiosInstance';
import { FiChevronLeft, FiChevronRight, FiX, FiTrash2, FiUpload, FiImage } from 'react-icons/fi';
import ImageGallery from '../components/ImageGallery';
import ProductInfo from '../components/ProductInfo';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import celebrationAnimation from '../assets/Celebration.json';

const enumUploadTypes = [
  { label: '빌려줘', value: 'LEND' },
  { label: '구해요', value: 'BORROW' },
];

const enumRentMethods = [
  { label: '모두 가능', value: 'BOTH' },
  { label: '직접 거래', value: 'ONLY_OFFLINE' },
  { label: '택배 거래', value: 'ONLY_ONLINE' },
];

const TOTAL_STEPS = 5;
const STEP_NAMES = ['이미지', '기본 정보', '분류/지역', '날짜 설정', '완료'];

function ProductCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const USE_FAKE_API = false;

  // 단계 관리
  const [currentStep, setCurrentStep] = useState(1);

  // 폼 상태
  const [form, setForm] = useState({
    uploadType: 'LEND',  // 기본값: 빌려줘
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

  // 파일 업로드 상태
  const [fileIds, setFileIds] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const dndZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragItemIndex = useRef(null);
  const rightFormRef = useRef(null);
  const hashtagInputRef = useRef(null);

  // 날짜 관리
  const [rentalRefs, setRentalRefs] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('available');
  
  // 달력 클릭 상태: null -> 시작일 선택 -> 종료일 선택 -> 초기화
  const [calClickState, setCalClickState] = useState('none'); // 'none' | 'start' | 'end'
  const [calStart, setCalStart] = useState(null);
  const [calEnd, setCalEnd] = useState(null);
  const [noEndDate, setNoEndDate] = useState(false);

  // 기타 상태
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const parseNumber = (value) => {
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9]/g, '')) || 0;
  };

  const formatCurrency = (num) => {
    const n = Number(num) || 0;
    return `${n.toLocaleString()}원`;
  };

  const handlePriceChange = (key, raw) => {
    const onlyDigits = raw.replace(/[^0-9]/g, '');
    const formatted = onlyDigits ? formatCurrency(Number(onlyDigits)) : '';
    updateField(key, formatted);
  };

  // 해시태그 관리
  const addHashtag = () => {
    const t = hashtagInput.trim();
    if (!t || hashtags.includes(t)) return;
    setHashtags((prev) => [...prev, t]);
    setHashtagInput('');
    // 입력창에 자동 포커스
    setTimeout(() => {
      hashtagInputRef.current?.focus();
    }, 0);
  };

  const removeHashtag = (t) => setHashtags((prev) => prev.filter((x) => x !== t));

  // 파일 업로드 로직
  const handleFiles = async (files) => {
    const fileArr = Array.from(files || []);
    if (fileArr.length === 0) return;
    setErrorMessage('');

    const localUrls = fileArr.map((f) => URL.createObjectURL(f));
    const previewStartIndex = filePreviews.length;
    setFilePreviews((prev) => [...prev, ...localUrls]);

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

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
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
    if (calendarMode === 'refuse') {
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
    switch (currentStep) {
      case 1:
        // 1단계: 이미지
        return fileIds.length > 0;
      case 2:
        // 2단계: 기본 정보
        return form.title && form.content && parseNumber(form.deposit) > 0 && parseNumber(form.rentalFee) > 0;
      case 3:
        return form.categoryId && form.sidoId && form.gunguId && form.dongId;
      case 4:
        return form.startRent && (noEndDate || form.endRent || form.endRent === '');
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, form, fileIds, noEndDate]);

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
    rentalRefs,
  });

  const handleSubmit = async () => {
    setErrorMessage('');
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (USE_FAKE_API) {
        navigate(ROUTE_PATHS.PRODUCT_DETAIL(String(Date.now())));
        return;
      }
      const res = await axiosInstance.post('/products', payload);
      
      let productId = null;
      if (res?.data) {
        if (typeof res.data === 'number') {
          productId = res.data;
        } else if (res.data?.data !== undefined) {
          productId = res.data.data;
        } else if (res.data?.body?.data !== undefined) {
          productId = res.data.body.data;
        } else if (res.data?.productId !== undefined) {
          productId = res.data.productId;
        }
      }
      
      if (productId) {
        navigate(ROUTE_PATHS.PRODUCT_DETAIL(String(productId)));
      } else {
        setErrorMessage('상품 등록은 성공했지만 상품 ID를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '상품 등록 중 오류가 발생했습니다.'
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

  // Step 1: 기본 정보
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">기본 정보</h2>
        <p className="text-gray-600">상품의 기본 정보를 입력해주세요</p>
      </div>

      {/* 좌우 레이아웃 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 왼쪽: 업로드 타입, 대여 방법, 영상 필수, 해시태그 */}
        <div className="w-full lg:w-1/3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">업로드 타입</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => updateField('uploadType', form.uploadType === 'LEND' ? 'BORROW' : 'LEND')}
                className="relative w-full h-12 rounded-lg p-1 transition-all duration-300 bg-gray-200"
              >
                {/* 슬라이더 */}
                <div
                  className="absolute top-1 h-10 w-[calc(50%-4px)] rounded-md shadow-md transition-all duration-300 flex items-center justify-center bg-gray-900"
                  style={{
                    left: form.uploadType === 'LEND' ? '4px' : 'calc(50% + 0px)'
                  }}
                />
                
                {/* 텍스트 레이어 */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <div className="w-1/2 flex items-center justify-center">
                    <span className={`text-sm font-bold transition-colors duration-300 ${form.uploadType === 'LEND' ? 'text-white' : 'text-gray-600'}`}>
                      빌려줘
                    </span>
                  </div>
                  <div className="w-1/2 flex items-center justify-center">
                    <span className={`text-sm font-bold transition-colors duration-300 ${form.uploadType === 'BORROW' ? 'text-white' : 'text-gray-600'}`}>
                      구해요
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

          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="text-sm font-medium text-black">거래 시 영상 필수</span>
            <button
              type="button"
              onClick={() => updateField('videoNecessary', !form.videoNecessary)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.videoNecessary ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                form.videoNecessary ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">해시태그</label>
            <div className="flex items-center border-2 border-gray-300 rounded-lg focus-within:border-black transition-colors bg-white overflow-hidden">
              {/* 입력창 */}
              <input
                ref={hashtagInputRef}
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                placeholder="예: 카메라"
                className="flex-1 px-3 py-2 bg-transparent text-sm text-black placeholder-gray-500 focus:outline-none"
              />
              
              {/* 추가 버튼 */}
              <button
                type="button"
                onClick={addHashtag}
                className="w-10 h-10 flex items-center justify-center bg-black text-white text-xl font-bold hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                +
              </button>
            </div>
            
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
        </div>

        {/* 오른쪽: 제목, 내용, 보증금, 일일요금 */}
        <div className="flex-1 space-y-1.5">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">제목</label>
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value.slice(0, 50))}
              placeholder="상품 제목을 입력하세요"
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
            />
            <div className="text-right text-xs text-gray-500 mt-1">{form.title.length}/50</div>
          </div>

          {/* 내용 + 보증금/일일요금 */}
          <div className="flex gap-4">
            {/* 왼쪽: 내용 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-black mb-1.5">내용</label>
              <textarea
                value={form.content}
                onChange={(e) => updateField('content', e.target.value.slice(0, 2000))}
                rows={5}
                placeholder="상세 내용을 입력하세요"
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black resize-none"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{form.content.length}/2000</div>
            </div>

            {/* 오른쪽: 보증금 + 일일요금 */}
            <div className="w-48 space-y-2">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">보증금</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.deposit}
                  onChange={(e) => handlePriceChange('deposit', e.target.value)}
                  placeholder="300,000원"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">일일요금</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.rentalFee}
                  onChange={(e) => handlePriceChange('rentalFee', e.target.value)}
                  placeholder="35,000원"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: 이미지 업로드
  const renderStep2 = () => (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-black mb-1">이미지 업로드</h2>
        <p className="text-gray-600 text-sm">상품 이미지를 업로드해주세요 (첫 번째 이미지가 대표 이미지입니다)</p>
      </div>

      {/* 드래그 영역과 미리보기를 가로로 배치 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 왼쪽: 드래그 영역 (정사각형) */}
        <div className="flex-shrink-0">
          <div
            ref={dndZoneRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
            className="w-full lg:w-80 aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors bg-gray-50"
          >
            <FiUpload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-black font-medium mb-1 text-center px-4 text-sm">여기로 드래그 또는 클릭하여 이미지 추가</p>
            <p className="text-gray-600 text-xs text-center px-4">여러 이미지를 한번에 업로드할 수 있습니다</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" disabled={uploading} />
            {uploading && <p className="text-gray-600 text-xs mt-1">업로드 중...</p>}
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

  // Step 3: 분류 및 지역
  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black mb-1">분류 및 지역</h2>
        <p className="text-gray-600 text-sm">상품의 카테고리와 지역을 선택해주세요</p>
      </div>

      <div className="space-y-3">
        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-black mb-1.5">카테고리 ID</label>
          <input
            value={form.categoryId ?? ''}
            onChange={(e) => updateField('categoryId', e.target.value)}
            placeholder="예: 5"
            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black"
          />
        </div>

        {/* 지역 */}
        <div>
          <label className="block text-sm font-medium text-black mb-1.5">지역</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">시도</label>
              <input
                value={form.sidoId}
                onChange={(e) => updateField('sidoId', e.target.value)}
                placeholder="시도"
                className="w-full px-3 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">군구</label>
              <input
                value={form.gunguId}
                onChange={(e) => updateField('gunguId', e.target.value)}
                placeholder="군구"
                className="w-full px-3 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">동</label>
              <input
                value={form.dongId}
                onChange={(e) => updateField('dongId', e.target.value)}
                placeholder="동"
                className="w-full px-3 py-3 bg-white border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: 날짜 설정
  const renderStep4 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black mb-1">대여 가능 기간</h2>
        <p className="text-gray-600 text-sm">대여 가능한 기간과 불가 기간을 설정해주세요</p>
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
              
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!d}
                  onClick={() => d && onCalendarClick(d)}
                  className={`h-8 w-full aspect-square rounded-lg text-xs transition-all ${
                    !d ? 'invisible' : 
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
                가능 기간
              </button>
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
            </div>

            {calendarMode === 'available' && (
              <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl">
                <label className="flex items-center gap-2 text-black mb-3">
                  <input
                    type="checkbox"
                    checked={noEndDate}
                    onChange={(e) => setNoEndDate(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">종료일 없음</span>
                </label>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>시작: {form.startRent ? new Date(form.startRent).toLocaleDateString('ko-KR') : '-'}</div>
                  <div>종료: {form.endRent === '' ? '종료일 없음' : (form.endRent ? new Date(form.endRent).toLocaleDateString('ko-KR') : '-')}</div>
                </div>
              </div>
            )}

            {calendarMode === 'refuse' && rentalRefs.length > 0 && (
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
          <p className="text-sm text-gray-500">← 왼쪽 미리보기에서 입력하신 정보를 확인해주세요</p>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep2(); // 이미지를 가장 먼저
      case 2: return renderStep1();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
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
            <h1 className="text-xl font-bold text-black">상품 등록</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - 좌우 레이아웃 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-40 h-[calc(100vh-64px-56px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 좌측: 미리보기 */}
          <div className="order-2 lg:order-1 lg:col-span-4">
            <div className="sticky top-24 bg-white border-2 border-gray-300 rounded-2xl p-3 shadow-lg" style={{ height: 'calc(100vh - 200px)' }}>
              <div className="space-y-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: '100%', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <ImageGallery 
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
                  {form.videoNecessary && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500 text-white">
                      영상 필수
                    </span>
                  )}
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
                    <div className="text-xs text-black font-medium">{form.categoryId || '-'}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-300">
                    <div className="text-[12px] text-gray-600 mb-1">지역</div>
                    <div className="text-xs text-black font-medium">{form.sidoId} {form.gunguId} {form.dongId}</div>
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

          {/* 우측: 입력 폼 */}
          <div className="order-1 lg:order-2 lg:col-span-8 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* 스크롤 가능한 콘텐츠 영역 */}
            <div 
              ref={rightFormRef} 
              className={`flex-1 scrollbar-hide pb-4 ${currentStep === 4 ? 'overflow-hidden' : 'overflow-y-auto'}`} 
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="mb-3">
                {renderCurrentStep()}
              </div>
            </div>

            {/* 네비게이션 버튼 - 고정 위치 */}
            <div className="flex-shrink-0 bg-white pt-3 border-t-2 border-gray-300 z-10">
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
                    {submitting ? '등록 중...' : '상품 등록'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 진행도 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            {STEP_NAMES.map((name, index) => (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 transition-all ${
                    index + 1 < currentStep
                      ? 'bg-black text-white border-black'
                      : index + 1 === currentStep
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}>
                    {index + 1 < currentStep ? '✓' : index + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${
                    index + 1 <= currentStep ? 'text-black' : 'text-gray-400'
                  }`}>
                    {name}
                  </span>
                </div>
                {index < STEP_NAMES.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 mb-5 transition-all ${
                    index + 1 < currentStep ? 'bg-black' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCreatePage;

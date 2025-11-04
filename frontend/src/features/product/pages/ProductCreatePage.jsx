/**
 * ProductCreatePage (UX 확장 버전)
 * - 이미지 DnD 업로드/정렬, 메인 이미지 표시
 * - 금액 실시간 포맷팅, 해시태그 칩, 세그먼티드 컨트롤
 * - 카테고리/지역 2단 팝오버, GPS 더미
 * - 날짜 전체 화면 모달(가능 기간/불가 기간)
 * - 고정 하단 CTA, 필수값 검증
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants/routePaths';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';
import { axiosInstance } from '@/lib/axios/axiosInstance';

const enumUploadTypes = [
  { label: '빌려줘', value: 'RENT' },
  { label: '구해요', value: 'BORROW' },
];

const enumRentMethods = [
  { label: '모두 가능', value: 'BOTH' },
  { label: '직접 거래', value: 'ONLY_OFFLINE' },
  { label: '택배 거래', value: 'ONLY_ONLINE' },
];

// 카테고리 팝오버와 더미 데이터는 제거하고, categoryId 직접 입력으로 단순화

function ProductCreatePage() {
  const navigate = useNavigate();
  const USE_FAKE_API = false; // 실제 백엔드 연동

  // 폼 상태
  const [form, setForm] = useState({
    uploadType: 'RENT',
    title: '',
    content: '',
    deposit: '', // 포맷팅된 문자열 (예: 300,000원)
    rentalFee: '', // 포맷팅된 문자열
    rentMethod: 'BOTH',
    videoNecessary: false,
    categoryId: null,
    categoryPathLabel: '',
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
  const [fileIds, setFileIds] = useState([]); // 서버에서 받은 fileId 목록
  const [filePreviews, setFilePreviews] = useState([]); // 로컬 미리보기 URL 목록
  const dndZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragItemIndex = useRef(null);

  // 모달 상태
  const [showPreview, setShowPreview] = useState(false);
  // 카테고리 팝오버 제거

  // 렌탈 불가 기간 (API 스펙에 맞춰 rentalRefs 사용)
  const [rentalRefs, setRentalRefs] = useState([]); // {startRef,endRef} ISO 문자열
  const [tempRefuseStart, setTempRefuseStart] = useState('');
  const [tempRefuseEnd, setTempRefuseEnd] = useState('');

  // 캘린더(상시 노출)
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('available'); // 'available' | 'refuse'
  const [calStart, setCalStart] = useState(null);
  const [calEnd, setCalEnd] = useState(null);
  const [noEndDate, setNoEndDate] = useState(false);

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

  const isSubmitDisabled = useMemo(() => {
    const hasRequired = form.title && fileIds.length > 0 && form.categoryId && form.sidoId && form.gunguId && form.dongId && form.startRent && (noEndDate || form.endRent || form.endRent === '');
    const hasPrices = parseNumber(form.deposit) > 0 && parseNumber(form.rentalFee) > 0;
    return !(hasRequired && hasPrices);
  }, [form, fileIds, noEndDate]);

  // 해시태그 추가/삭제
  const addHashtag = () => {
    const t = hashtagInput.trim();
    if (!t) return;
    if (hashtags.includes(t)) return;
    setHashtags((prev) => [...prev, t]);
    setHashtagInput('');
  };
  const removeHashtag = (t) => setHashtags((prev) => prev.filter((x) => x !== t));

  // 파일 업로드 (클릭/드롭) - 실제 업로드 API 호출
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const handleFiles = async (files) => {
    const fileArr = Array.from(files || []);
    if (fileArr.length === 0) return;
    setErrorMessage('');

    // 1) 즉시 로컬 미리보기 추가 (업로드 전에 미리보기 표시)
    const localUrls = fileArr.map((f) => URL.createObjectURL(f));
    const previewStartIndex = filePreviews.length;
    setFilePreviews((prev) => [...prev, ...localUrls]);

    // 2) 업로드 모드에 따라 파일 업로드 처리
    if (USE_FAKE_API) {
      const tmpIds = fileArr.map((_, i) => `tmp_${Date.now()}_${i}`);
      setFileIds((prev) => [...prev, ...tmpIds]);
      return;
    }

    setUploading(true);
    const uploadedResults = [];
    const failedIndices = [];
    
    try {
      // 각 파일을 개별적으로 업로드 (하나 실패해도 다른 파일은 계속 진행)
      const uploadPromises = fileArr.map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await axiosInstance.post(API_ENDPOINTS.FILE.BASE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          // 실제 응답 구조: res.data.body.data.fileId
          // res.data = { body: { data: { fileId, url }, message, status, timestamp }, headers, statusCode, statusCodeValue }
          console.log(`파일 업로드 응답 [${file.name}]:`, res);
          
          let fileId = null;
          let url = null;
          
          if (res.data) {
            // 실제 응답 구조에 맞춰 파싱
            // 경우 1: res.data.body.data.fileId (실제 응답 구조)
            if (res.data.body?.data?.fileId) {
              fileId = res.data.body.data.fileId;
              url = res.data.body.data.url;
            }
            // 경우 2: res.data.data.fileId (혹시 다른 형식일 경우)
            else if (res.data.data?.fileId) {
              fileId = res.data.data.fileId;
              url = res.data.data.url;
            }
            // 경우 3: 직접 res.data.fileId (스펙에 명시된 형식)
            else if (res.data.fileId) {
              fileId = res.data.fileId;
              url = res.data.url;
            }
            // 경우 4: res.data.body.fileId (혹시 body에 직접 있는 경우)
            else if (res.data.body?.fileId) {
              fileId = res.data.body.fileId;
              url = res.data.body.url;
            }
          }
          
          console.log(`추출된 fileId: ${fileId}, url: ${url}`);
          
          if (!fileId) {
            console.error(`파일 ${file.name} 업로드 응답에 fileId가 없습니다.`);
            console.error('전체 응답 구조:', {
              'res.data': res.data,
              'res.data.body': res.data?.body,
              'res.data.body?.data': res.data?.body?.data,
              'res.data.body?.data?.fileId': res.data?.body?.data?.fileId,
              'res.data.data': res.data?.data,
              'res.data.data?.fileId': res.data?.data?.fileId,
              'res.data.fileId': res.data?.fileId
            });
            throw new Error('fileId가 응답에 없습니다');
          }
          
          uploadedResults.push({
            fileId: fileId,
            index: previewStartIndex + index
          });
          return { success: true, fileId: fileId, index: previewStartIndex + index };
        } catch (fileErr) {
          console.error(`파일 ${file.name} 업로드 실패:`, fileErr);
          console.error('에러 상세:', {
            message: fileErr?.message,
            response: fileErr?.response?.data,
            status: fileErr?.response?.status
          });
          failedIndices.push(previewStartIndex + index);
          return { success: false, index: previewStartIndex + index };
        }
      });

      await Promise.all(uploadPromises);

      // 성공한 파일들의 fileId만 저장
      const successfulUploads = uploadedResults.filter(r => r.fileId !== undefined && r.fileId !== null);
      if (successfulUploads.length > 0) {
        setFileIds((prev) => [...prev, ...successfulUploads.map(r => r.fileId)]);
      }

      // 업로드 실패한 파일들의 미리보기 제거
      if (failedIndices.length > 0) {
        setFilePreviews((prev) => {
          const newPreviews = [...prev];
          // 역순으로 제거 (인덱스 변경 방지)
          failedIndices.reverse().forEach(idx => {
            if (idx < newPreviews.length) {
              const url = newPreviews[idx];
              if (url?.startsWith('blob:')) {
                try {
                  URL.revokeObjectURL(url);
                } catch {}
              }
              newPreviews.splice(idx, 1);
            }
          });
          return newPreviews;
        });
        
        if (successfulUploads.length === 0) {
          // 모든 파일이 실패한 경우
          setErrorMessage('이미지 업로드에 실패했습니다. 파일을 확인 후 다시 시도해주세요.');
        } else {
          // 일부만 실패한 경우
          setErrorMessage(`${failedIndices.length}개의 이미지 업로드에 실패했습니다.`);
        }
      }
    } catch (err) {
      console.error('파일 업로드 오류:', err);
      // 예상치 못한 오류 발생 시 모든 미리보기 제거
      setFilePreviews((prev) => {
        const newPreviews = [...prev];
        localUrls.forEach(url => {
          if (url?.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(url);
            } catch {}
          }
        });
        return newPreviews.slice(0, previewStartIndex);
      });
      setErrorMessage(err?.response?.data?.message || '이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
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
    // fileIds와 filePreviews 동기화하여 제거
    setFileIds((prev) => {
      const newIds = [...prev];
      if (idx < newIds.length) {
        newIds.splice(idx, 1);
      }
      return newIds;
    });
    setFilePreviews((prev) => {
      const newPreviews = [...prev];
      if (idx < newPreviews.length) {
        const toRemove = newPreviews[idx];
        if (toRemove?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(toRemove);
          } catch {}
        }
        newPreviews.splice(idx, 1);
      }
      return newPreviews;
    });
  };

  // 썸네일 정렬 (간단 DnD)
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

  // 카테고리 팝오버 제거됨

  // GPS 자동 설정 제거

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
  const isPendingRange = (d) => calStart && calEnd && d >= calStart && d <= calEnd;
  const isInAvailableRange = (d) => {
    if (!d || !form.startRent) return false;
    const s = new Date(form.startRent);
    const e = form.endRent === '' || !form.endRent ? null : new Date(form.endRent);
    if (!e) return sameDay(d, s) || d >= s; // 종료일 없음이면 시작일 이후 전부로 간주(표시는 시작일만 강조)
    return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && d <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
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

  const onCalendarClick = (date) => {
    if (!date) return;
    if (!calStart) {
      setCalStart(date);
      setCalEnd(null);
      return;
    }
    if (!calEnd) {
      if (date >= calStart) {
        setCalEnd(date);
        // 두 번째 선택 완료 → 자동 적용
        setTimeout(() => {
          if (calendarMode === 'available') {
            updateField('startRent', new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString().slice(0,16));
            if (noEndDate) {
              updateField('endRent', '');
            } else {
              updateField('endRent', new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16));
            }
          } else {
            const startIso = new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString();
            const endIso = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString();
            setRentalRefs((prev) => [...prev, { startRef: startIso, endRef: endIso }]);
          }
        }, 0);
      } else {
        setCalStart(date);
        setCalEnd(null);
      }
      return;
    }
    // 이미 범위가 있으면 새 선택 시작
    setCalStart(date);
    setCalEnd(null);
    if (calendarMode === 'refuse') {
      // 단일일 추가(두 번째 클릭 없이 같은 날로 간주)
      const startIso = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString();
      setRentalRefs((prev) => [...prev, { startRef: startIso, endRef: startIso }]);
    }
  };

  const applyCalendar = () => {
    if (!calStart) return;
    if (calendarMode === 'available') {
      updateField('startRent', new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString().slice(0,16));
      if (noEndDate) {
        updateField('endRent', '');
      } else if (!calEnd) {
        // 시작일만 선택된 경우 시작=종료 동일 처리
        updateField('endRent', new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString().slice(0,16));
      } else {
        updateField('endRent', new Date(calEnd.getTime() - calEnd.getTimezoneOffset()*60000).toISOString().slice(0,16));
      }
    } else {
      const startIso = new Date(calStart.getTime() - calStart.getTimezoneOffset()*60000).toISOString();
      const endBase = calEnd ? calEnd : calStart; // 하루 단위 허용
      const endIso = new Date(endBase.getTime() - endBase.getTimezoneOffset()*60000).toISOString();
      setRentalRefs((prev) => [...prev, { startRef: startIso, endRef: endIso }]);
    }
  };

  // 불가 기간 추가
  const addRefuseRange = () => {
    if (!tempRefuseStart || !tempRefuseEnd) return;
    setRentalRefs((prev) => [...prev, {
      startRef: new Date(tempRefuseStart).toISOString(),
      endRef: new Date(tempRefuseEnd).toISOString(),
    }]);
    setTempRefuseStart('');
    setTempRefuseEnd('');
  };
  const removeRefuseAt = (i) => setRentalRefs((prev) => prev.filter((_, idx) => idx !== i));

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

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (USE_FAKE_API) {
        // 프론트 전용: 로컬에서 정상 흐름 시뮬레이션
        const fakeId = Date.now();
        navigate(ROUTE_PATHS.PRODUCT_DETAIL(fakeId));
        return;
      }
      const res = await axiosInstance.post('/products', payload);
      
      // 응답 구조 확인: productId (long 타입) 추출
      // 가능한 응답 구조:
      // 1. 직접 productId 반환: res.data = 6
      // 2. ApiResponse 구조: res.data = { status, message, data: 6, timestamp }
      // 3. body.data 구조: res.data.body.data = 6
      let productId = null;
      
      if (res?.data) {
        // 직접 숫자로 반환되는 경우
        if (typeof res.data === 'number') {
          productId = res.data;
        }
        // ApiResponse 구조인 경우
        else if (res.data?.data !== undefined) {
          productId = res.data.data;
        }
        // body.data 구조인 경우
        else if (res.data?.body?.data !== undefined) {
          productId = res.data.body.data;
        }
        // productId 필드가 있는 경우
        else if (res.data?.productId !== undefined) {
          productId = res.data.productId;
        }
      }
      
      console.log('상품 등록 응답:', res?.data);
      console.log('추출된 productId:', productId);
      
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
        '상품 등록 중 오류가 발생했습니다. 입력값을 확인 후 다시 시도해주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 스타일 헬퍼
  const inputClass = 'w-full px-3 py-2 rounded-lg text-gray-900 border border-gray-300';
  const glassBox = {
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.6)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.08)'
  };
  const selectedChipStyle = { background: 'linear-gradient(135deg, #007ACC, #0056CC)' };
  const unselectedChipStyle = { background: 'rgba(0,0,0,0.04)' };
  const selectedDayStyle = { background: 'linear-gradient(135deg, #007ACC, #0056CC)', boxShadow: '0 4px 12px #007ACC40' };
  const refuseDayStyle = { background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 4px 12px #EF444440', color: '#fff' };
  const normalDayStyle = { background: 'rgba(255,255,255,0.7)' };
  const monthLabel = calendarMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-8 space-y-10">
        {errorMessage && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-700 border border-red-200 bg-red-50">
            {errorMessage}
          </div>
        )}
        <div className="space-y-2 flex items-center justify-between">
          <button type="button" onClick={()=>navigate(-1)} className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            뒤로가기
          </button>
          <span />
        </div>

        {/* 이미지 업로드 DnD */}
        <section className="space-y-4" style={glassBox}>
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">이미지 업로드</label>
            <div
              ref={dndZoneRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={()=>{ if (!uploading) fileInputRef.current?.click(); }}
              className="w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center text-gray-500 hover:text-[#007ACC] transition-colors cursor-pointer"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            >
              <div className="text-center">
                <div className="font-medium">여기로 드래그 또는 클릭하여 이미지 추가</div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" disabled={uploading} />
                {uploading && <div className="text-xs text-gray-500 mt-2">업로드 중...</div>}
              </div>
            </div>

            {filePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden select-none"
                    draggable
                    onDragStart={onThumbDragStart(idx)}
                    onDrop={onThumbDrop(idx)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <img src={src} alt={`preview-${idx}`} className="w-full h-28 object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, #007ACC, #0056CC)' }}
                      >MAIN</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                    >삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 기본 정보 */}
        <section className="space-y-4 p-4 rounded-2xl" style={glassBox}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업로드 타입</label>
              <select value={form.uploadType} onChange={(e) => updateField('uploadType', e.target.value)} className={inputClass}>
                {enumUploadTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">대여 방법</label>
              <div className="grid grid-cols-3 gap-2">
                {enumRentMethods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => updateField('rentMethod', m.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${form.rentMethod === m.value ? 'text-white' : 'text-gray-700'}`}
                    style={form.rentMethod === m.value ? { background: 'linear-gradient(135deg, #007ACC, #0056CC)' } : { background: 'rgba(0,0,0,0.04)' }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input value={form.title} onChange={(e) => updateField('title', e.target.value.slice(0, 50))} placeholder="최대 50자 이내" className={inputClass} />
            <div className="text-right text-xs text-gray-500 mt-1">{form.title.length}/50</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea value={form.content} onChange={(e) => updateField('content', e.target.value.slice(0, 2000))} rows={6} placeholder="상세 내용을 입력하세요" className={inputClass} />
            <div className="text-right text-xs text-gray-500 mt-1">{form.content.length}/2000</div>
          </div>

          {/* 금액 입력 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">보증금</label>
              <input type="text" inputMode="numeric" value={form.deposit} onChange={(e) => handlePriceChange('deposit', e.target.value)} className={`${inputClass} overflow-hidden text-ellipsis`} placeholder="예: 300,000원" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">일일요금</label>
              <input type="text" inputMode="numeric" value={form.rentalFee} onChange={(e) => handlePriceChange('rentalFee', e.target.value)} className={`${inputClass} overflow-hidden text-ellipsis`} placeholder="예: 35,000원" />
            </div>
          </div>

          {/* 영상 필수 토글 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">거래 시 영상 필수</span>
            <button type="button" onClick={() => updateField('videoNecessary', !form.videoNecessary)} className={`relative inline-flex h-6 w-11 items-center rounded-full ${form.videoNecessary ? 'bg-[#007ACC]' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.videoNecessary ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* 해시태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">해시태그</label>
            <div className="flex gap-2">
              <input value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} className={inputClass} placeholder="예: 카메라" />
              <button type="button" onClick={addHashtag} className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #007ACC, #0056CC)' }}>+</button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full" style={{ background: '#007ACC15', color: '#0A63C9', border: '1px solid #0A63C933' }}>
                    {t}
                    <button type="button" onClick={() => removeHashtag(t)} className="opacity-70 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 분류/지역 */}
        <section className="space-y-4 p-4 rounded-2xl" style={glassBox}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 ID</label>
              <input value={form.categoryId ?? ''} onChange={(e)=>updateField('categoryId', e.target.value)} className={inputClass} placeholder="예: 5" />
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시도 ID</label>
                <input value={form.sidoId} onChange={(e) => updateField('sidoId', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">군구 ID</label>
                <input value={form.gunguId} onChange={(e) => updateField('gunguId', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">동 ID</label>
                <input value={form.dongId} onChange={(e) => updateField('dongId', e.target.value)} className={inputClass} />
              </div>
            </div>
            
          </div>
        </section>

        {/* 날짜/불가 기간 - 상시 노출 캘린더 */}
        <section className="space-y-4 p-4 rounded-2xl" style={glassBox}>
          <div className="flex items-start gap-6">
            {/* 캘린더 - 더 작게 */}
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={()=>shiftMonth(-1)} className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">이전</button>
                <div className="text-gray-900 font-semibold">{monthLabel}</div>
                <button type="button" onClick={()=>shiftMonth(1)} className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">다음</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-600 mb-1">
                {['일','월','화','수','목','금','토'].map(d=> (<div key={d} className="py-1">{d}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(calendarMonth).map((d,idx)=> {
                  const selected = isDateSelected(d) || isPendingRange(d);
                  const inAvailable = isInAvailableRange(d);
                  const inRefuse = isInRefuseRanges(d);
                  const style = inRefuse ? refuseDayStyle : (selected || inAvailable ? selectedDayStyle : normalDayStyle);
                  const cls = inRefuse || selected || inAvailable ? 'text-white font-semibold' : 'text-gray-800';
                  return (
                    <button type="button" key={idx} disabled={!d} onClick={()=>d && onCalendarClick(d)} className={`h-8 w-8 rounded-lg text-[11px] flex items-center justify-center transition-all ${!d?'invisible':''} ${cls}`} style={style}>
                      {d && d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측 사이드 패널 */}
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setCalendarMode('available')} className={`px-3 py-2 rounded-lg text-sm font-medium ${calendarMode==='available'?'text-white':'text-gray-700'}`} style={calendarMode==='available'?selectedChipStyle:unselectedChipStyle}>가능 기간 설정</button>
                <button type="button" onClick={() => setCalendarMode('refuse')} className={`px-3 py-2 rounded-lg text-sm font-medium ${calendarMode==='refuse'?'text-white':'text-gray-700'}`} style={calendarMode==='refuse'?selectedChipStyle:unselectedChipStyle}>불가 기간 추가</button>
              </div>
              {calendarMode==='available' && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={noEndDate} onChange={(e)=>setNoEndDate(e.target.checked)} />
                  종료일 없음
                </label>
              )}
              <div className="text-sm text-gray-900">
                {!calStart && '날짜를 선택하세요'}
                {calStart && !calEnd && '시작일 선택됨'}
                {calStart && calEnd && `${calStart.toLocaleDateString()} ~ ${calEnd.toLocaleDateString()}`}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={()=>{
                    // 선택 상태 초기화
                    setCalStart(null);
                    setCalEnd(null);
                    setNoEndDate(false);
                    // 적용 값 전체 초기화 (가능/불가 모두)
                    updateField('startRent', '');
                    updateField('endRent', '');
                    setRentalRefs([]);
                  }}
                  className="px-3 py-2 rounded-lg border text-gray-700"
                >초기화</button>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-2">대여 가능 기간</div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-600">시작:</span> {form.startRent ? new Date(form.startRent).toLocaleDateString() : '-'}
                    </div>
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-600">종료:</span> {form.endRent === '' ? '종료일 없음' : (form.endRent ? new Date(form.endRent).toLocaleDateString() : '-')}
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-2">렌탈 불가 기간</div>
                  <div className="space-y-2">
                    {rentalRefs.length === 0 ? (
                      <span className="text-sm text-gray-500">없음</span>
                    ) : (
                      <div className="space-y-1">
                        {rentalRefs.map((r,i)=> (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200">
                            <span className="text-sm text-gray-900">
                              {new Date(r.startRef).toLocaleDateString()} ~ {new Date(r.endRef).toLocaleDateString()}
                            </span>
                            <button type="button" onClick={()=>setRentalRefs(prev=>prev.filter((_,idx)=>idx!==i))} className="text-gray-400 hover:text-red-500 text-sm">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 카테고리 팝오버 제거 */}

        {/* 미리보기 모달 */}
        {showPreview && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 backdrop-blur-md" onClick={()=>setShowPreview(false)} />
            <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">상품 미리보기</h3>
                  <button onClick={()=>setShowPreview(false)} className="px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100">닫기</button>
                </div>

                {/* 이미지 우선, 세로 레이아웃 */}
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    {filePreviews[0] ? (
                      <img src={filePreviews[0]} alt="preview-main" className="w-full h-64 object-cover" />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-gray-500 bg-gray-100">이미지 없음</div>
                    )}
                  </div>
                  {filePreviews.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {filePreviews.slice(1,9).map((src, i)=> (
                        <img key={i} src={src} alt={`thumb-${i}`} className="w-full h-16 object-cover rounded-lg border" />
                      ))}
                    </div>
                  )}

                  {/* 정보 섹션 */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">{form.title || '제목 미입력'}</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          {enumUploadTypes.find(u=>u.value===form.uploadType)?.label || '-'}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          {enumRentMethods.find(r=>r.value===form.rentMethod)?.label || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">일일 대여료</span>
                        <span className="text-lg font-bold text-blue-600">{form.rentalFee || '0원'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">보증금</span>
                        <span className="text-sm font-medium text-gray-900">{form.deposit || '0원'}</span>
                      </div>
                    </div>

                    {hashtags.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">해시태그</div>
                        <div className="flex flex-wrap gap-2">
                          {hashtags.map((t)=> (
                            <span key={t} className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 border border-blue-200">#{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">상품 설명</div>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{form.content || '상세 설명 미입력'}</div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">위치 정보</div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                          <div className="text-sm text-gray-900">시도: {form.sidoId || '-'}</div>
                          <div className="text-sm text-gray-900">군구: {form.gunguId || '-'}</div>
                          <div className="text-sm text-gray-900">동: {form.dongId || '-'}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">대여 가능 기간</div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                          <div className="text-sm text-gray-900">시작: {form.startRent ? new Date(form.startRent).toLocaleDateString() : '-'}</div>
                          <div className="text-sm text-gray-900">종료: {form.endRent === '' ? '종료일 없음' : (form.endRent ? new Date(form.endRent).toLocaleDateString() : '-')}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">렌탈 불가 기간</div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          {rentalRefs.length === 0 ? (
                            <div className="text-sm text-gray-500">없음</div>
                          ) : (
                            <div className="space-y-1">
                              {rentalRefs.map((r,i)=>(
                                <div key={i} className="text-sm text-gray-900">{new Date(r.startRef).toLocaleDateString()} ~ {new Date(r.endRef).toLocaleDateString()}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 하단 고정 CTA + 미리보기 */}
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-3 shadow-lg flex gap-3">
              <button type="button" onClick={()=>setShowPreview(true)} className="px-4 py-3 rounded-lg border text-gray-700 font-medium">미리보기</button>
              <button type="button" onClick={() => navigate(ROUTE_PATHS.PRODUCTS)} className="flex-1 py-3 rounded-lg border text-gray-700 font-medium">취소</button>
              <button type="submit" disabled={isSubmitDisabled} className={`flex-1 py-3 rounded-lg text-white font-bold ${isSubmitDisabled ? 'bg-blue-300 cursor-not-allowed' : ''}`} style={!isSubmitDisabled ? { background: 'linear-gradient(135deg, #007ACC, #0056CC)' } : {}}>
                상품 등록
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProductCreatePage;



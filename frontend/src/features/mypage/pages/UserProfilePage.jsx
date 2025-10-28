/**
 * UserProfilePage Component
 * 상대방 프로필 페이지 컴포넌트 (현대적인 대시보드 스타일)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';
import ProductCard from '../components/ProductCard';
import { DUMMY_USERS, DUMMY_PRODUCTS, DUMMY_REVIEWS, DUMMY_RESERVATIONS } from '../../../shared/constants/dummyData';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const UserProfilePage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [reviewTab, setReviewTab] = useState('borrowed'); // borrowed: 빌렸을 때, lent: 빌려줬을 때
  const [user, setUser] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [memberId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log('UserProfilePage - memberId:', memberId);
      console.log('UserProfilePage - DUMMY_USERS:', DUMMY_USERS);
      
      const foundUser = DUMMY_USERS.others.find(u => u.userId === parseInt(memberId));
      console.log('UserProfilePage - foundUser:', foundUser);
      
      if (!foundUser) {
        console.error('사용자를 찾을 수 없습니다:', memberId);
        navigate('/404');
        return;
      }
      setUser(foundUser);

      // 사용자 상품 로드
      const products = DUMMY_PRODUCTS.filter(p => p.sellerId === parseInt(memberId));
      setUserProducts(products);

      // 사용자 리뷰 로드
      const reviews = DUMMY_REVIEWS.filter(r => r.reviewerId === parseInt(memberId) || r.revieweeId === parseInt(memberId));
      setUserReviews(reviews);

    } catch (error) {
      console.error('사용자 프로필 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 활동 일수 계산
  const getActivityDays = (createdAt) => {
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 성별 표시 텍스트
  const getGenderText = (gender) => {
    return gender === 'male' ? '남성' : '여성';
  };

  // 나이 계산
  const getAge = (birth) => {
    const birthDate = new Date(birth);
    const currentDate = new Date();
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getReviewType = (review) => {
    return review.reviewerId === parseInt(memberId) ? '빌려줬을 때' : '빌렸을 때';
  };

  const getFilteredReviews = () => {
    if (reviewTab === 'lent') {
      // 빌려줬을 때: 내가 빌려준 상품에 대한 리뷰 (내가 받은 리뷰)
      return userReviews.filter(r => r.revieweeId === parseInt(memberId));
    } else {
      // 빌렸을 때: 내가 빌린 상품에 대한 리뷰 (내가 작성한 리뷰)
      return userReviews.filter(r => r.reviewerId === parseInt(memberId));
    }
  };

  // 선택된 상품의 대여 예약 내역 가져오기
  const getProductReservations = () => {
    if (!selectedProduct) return [];
    return DUMMY_RESERVATIONS.filter(reservation => 
      reservation.productId === selectedProduct.id && 
      reservation.ownerId === parseInt(memberId)
    );
  };

  // 특정 날짜에 예약이 있는지 확인
  const hasReservationOnDate = (day) => {
    const reservations = getProductReservations();
    const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return reservations.some(reservation => {
      const startDate = new Date(reservation.startDate);
      const endDate = new Date(reservation.endDate);
      const checkDate = new Date(dateStr);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  if (isLoading) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg">프로필을 불러오는 중...</div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <div className="text-red-500 text-xl mb-6">사용자를 찾을 수 없습니다.</div>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              돌아가기
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SideNavbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 뒤로가기 버튼 */}
        <div className="p-6 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100/50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 px-6 pb-6" style={{ paddingTop: '0.5rem' }}>
          {/* 왼쪽 사이드바 - 사용자 프로필 */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              {/* 사용자 프로필 섹션 */}
              <div className="text-center mb-6">
                <ProfileImage 
                  src={user.profileImageUrl}
                  alt={user.username}
                  size={80}
                  className="w-20 h-20 mx-auto mb-4"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.username}</h2>
                <p className="text-gray-500 text-sm mb-2">{user.bio || '소개가 없습니다.'}</p>
                
                {/* 평점 표시 */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex gap-1">
                    {(() => {
                      const calcStarRates = () => {
                        let tempStarRatesArr = [0, 0, 0, 0, 0];
                        let starScore = user.rating;

                        for (let i = 0; i < 5; i++) {
                          if (starScore >= 1) {
                            tempStarRatesArr[i] = 14; // 별 하나당 14
                            starScore -= 1;
                          } else {
                            tempStarRatesArr[i] = starScore * 14; // 부분 채우기
                            break;
                          }
                        }

                        return tempStarRatesArr;
                      };

                      const ratesResArr = calcStarRates();
                      const STAR_IDX_ARR = ['first', 'second', 'third', 'fourth', 'last'];

                      return STAR_IDX_ARR.map((item, idx) => {
                        const clipId = `clip-${idx}-${user.rating}`;
                        const pathId = `path-${idx}-${user.rating}`;

                        return (
                          <span key={`${item}_${idx}`}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={24}
                              height={24}
                              viewBox="0 0 14 13"
                              fill="#cacaca"
                            >
                              <clipPath id={clipId}>
                                <rect width={ratesResArr[idx]} height={24} />
                              </clipPath>
                              <path
                                id={pathId}
                                d="M9,2l2.163,4.279L16,6.969,12.5,10.3l.826,4.7L9,12.779,4.674,15,5.5,10.3,2,6.969l4.837-.69Z"
                                transform="translate(-2 -2)"
                              />
                              <use
                                clipPath={`url(#${clipId})`}
                                href={`#${pathId}`}
                                fill="#FFBF0F"
                              />
                            </svg>
                          </span>
                        );
                      });
                    })()}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{user.rating}</span>
                </div>
                
                {/* 사용자 정보 */}
                <div className="bg-gray-50 rounded-xl mb-4" style={{ padding: '14px' }}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">성별</div>
                      <div className="font-medium text-gray-900">{getGenderText(user.gender)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">나이</div>
                      <div className="font-medium text-gray-900">{getAge(user.birth)}세</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">활동 기간</div>
                      <div className="font-medium text-blue-600">{getActivityDays(user.createdAt)}일째 활동중</div>
                    </div>
                  </div>
                </div>
                
                {/* 통계 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-xl font-bold text-blue-600">{userProducts.length}</div>
                    <div className="text-xs text-blue-500">등록 상품</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-xl font-bold text-blue-600">{userReviews.length}</div>
                    <div className="text-xs text-blue-500">리뷰</div>
                  </div>
                </div>
              </div>

              {/* 네비게이션 링크 */}
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'products'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-medium">등록 상품</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'reviews'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="font-medium">리뷰</span>
                </button>
              </div>
            </div>
          </div>

          {/* 중앙 메인 콘텐츠 영역 */}
          <div className="flex-1">

            {/* 등록 상품 섹션 */}
            {activeTab === 'products' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-[calc(100vh-100px)] flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex-shrink-0">등록 상품</h3>
                {userProducts.length > 0 ? (
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                      {userProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={{
                            ...product,
                            image: product.images[0],
                            name: product.title
                          }}
                          onClick={() => navigate(`/products/${product.id}`)}
                          actionType="view"
                          status="available"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">등록된 상품이 없습니다</h4>
                      <p className="text-gray-500">아직 등록한 상품이 없습니다.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 리뷰 섹션 */}
            {activeTab === 'reviews' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-900">리뷰</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(user.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-600">{user.rating}</span>
                    </div>
                  </div>
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setReviewTab('borrowed')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        reviewTab === 'borrowed'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌렸을 때
                    </button>
                    <button
                      onClick={() => setReviewTab('lent')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        reviewTab === 'lent'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌려줬을 때
                    </button>
                  </div>
                </div>

                {getFilteredReviews().length > 0 ? (
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="space-y-4 pr-2">
                    {getFilteredReviews().map((review) => (
                      <div key={review.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={review.product?.images?.[0]}
                            alt={review.product?.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               <ProfileImage 
                                 src={review.reviewer.profileImageUrl}
                                 alt={review.reviewer.username}
                                 size={24}
                                 className="w-6 h-6"
                               />
                               <span className="font-medium text-gray-900">{review.reviewer.username}</span>
                              <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{review.product?.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{review.content}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">{review.rating}/5</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getReviewType(review) === '빌려줬을 때' 
                                  ? 'bg-blue-100 text-blue-600' 
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {getReviewType(review)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/products/${review.product?.id}`)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {reviewTab === 'lent' ? '빌려줬을 때 리뷰가 없습니다' : '빌렸을 때 리뷰가 없습니다'}
                    </h4>
                    <p className="text-gray-500">아직 해당 리뷰가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽 위젯 영역 */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="space-y-6">
              {/* 달력 위젯 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h4 className="font-semibold text-gray-900">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</h4>
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                    <div key={day} className="p-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <div key={day} className={`p-2 text-center text-sm rounded-lg ${
                      day === new Date().getDate() ? 'bg-blue-500 text-white' :
                      selectedProduct && hasReservationOnDate(day) ? 'bg-blue-100 text-blue-600' :
                      'text-gray-700 hover:bg-gray-100'
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* 등록 상품 목록 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-[calc(100vh-450px)] flex flex-col">
                <h4 className="font-semibold text-gray-900 mb-4 flex-shrink-0">등록 상품</h4>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="space-y-3 pr-2">
                    {userProducts.map((product, index) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                          selectedProduct?.id === product.id
                            ? 'bg-blue-100 text-blue-600'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-400' :
                          index === 1 ? 'bg-blue-500' :
                          index === 2 ? 'bg-blue-600' :
                          'bg-blue-300'
                        }`}></div>
                        <span className="text-sm font-medium truncate">{product.title}</span>
                      </button>
                    ))}
                    {userProducts.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-4 text-gray-500 text-sm">
                          등록된 상품이 없습니다
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfilePage;
/**
 * UserProfilePage Component
 * 상대방 프로필 페이지 컴포넌트 (현대적인 대시보드 스타일)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';
import ReviewCard from '../../review/components/ReviewCard';
import { useUserProfile } from '../../user/hooks/useUserProfile';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { axiosInstance } from '@/lib/axios/axiosInstance';
import UserProfileProductList from '../components/UserProfileProductList';

const UserProfilePage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [reviewTab, setReviewTab] = useState('borrowed'); // borrowed: 빌렸을 때, lent: 빌려줬을 때
  const [userProducts, setUserProducts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    content: [],
    totalPages: 1,
    currentPage: 0
  });
  const [reviewPageInfo, setReviewPageInfo] = useState({
    content: [],
    totalPages: 1,
    currentPage: 0,
    uploadType: 'BORROW'   // 기본값: 빌렸을 때
  });
  
  // 회원 정보 조회 - useUserProfile 훅 사용 (userApi.getUser 내부 호출)
  const { user, isLoading, error } = useUserProfile(memberId ? parseInt(memberId) : null);

  useEffect(() => {
    if (error) {
      console.error('사용자 프로필 로드 실패:', error);
      navigate('/404');
      return;
    }

    // user 정보만 확인
    if (user && memberId) {
      // TODO: API 호출로 리뷰 조회
      // const reviews = await reviewApi.getUserReviews(memberId);
      // setUserReviews(reviews);
      setUserReviews([]);
    }
  }, [user, memberId, error, navigate]);

  useEffect(() => {
    const fetchUserProducts = async () => {
      const res = await axiosInstance.get(`/products/member/${memberId}`, {
        params: { page: pageInfo.currentPage, size: 12 },
      });

      const data = res?.data?.body?.data;

      setPageInfo({
        content: data.content,
        totalPages: data.totalPages,
        currentPage: data.number
      });
    };

    fetchUserProducts();
  }, [memberId, pageInfo.currentPage]);

  useEffect(() => {
    if (!memberId || !reviewPageInfo.uploadType) return;

    const fetchReviews = async () => {
      try {
        const res = await axiosInstance.get(`/review/member/${memberId}`, {
          params: {
            uploadType: reviewPageInfo.uploadType,
            page: reviewPageInfo.currentPage + 1, // 백엔드 page는 1부터 시작
            size: 5
          }
        });

        const data = res.data.data;

        setReviewPageInfo(prev => ({
          ...prev,
          content: data.data,
          totalPages: Math.ceil(data.totalCount / data.size),
          currentPage: data.page - 1
        }));
      } catch (err) {
        console.error("리뷰 로드 실패:", err);
      }
    };

    fetchReviews();
  }, [memberId, reviewPageInfo.uploadType, reviewPageInfo.currentPage]);

  const handleReviewTabChange = (tab) => {
    setReviewTab(tab);

    setReviewPageInfo(prev => ({
      ...prev,
      uploadType: tab === 'borrowed' ? 'BORROW' : 'RENT',
      currentPage: 0
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getReviewType = (review) => {
    return review.reviewerId === parseInt(memberId) ? '빌려줬을 때' : '빌렸을 때';
  };


  if (isLoading) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
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
                  alt={user.nickname}
                  size={80}
                  className="w-20 h-20 mx-auto mb-4"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.nickname}</h2>
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
                      <div className="text-gray-600 mb-1">이름</div>
                      <div className="font-medium text-gray-900">{user.name || '-'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">인증 상태</div>
                      <div className="font-medium text-gray-900">{user.verified ? '✓ 인증됨' : '미인증'}</div>
                    </div>
                  </div>
                  {user.email && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-gray-600 mb-1">이메일</div>
                        <div className="font-medium text-gray-900 text-xs">{user.email}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 통계 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-xl font-bold text-gray-900">{userProducts.length}</div>
                    <div className="text-xs text-gray-500">등록 상품</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-xl font-bold text-gray-900">{userReviews.length}</div>
                    <div className="text-xs text-gray-500">리뷰</div>
                  </div>
                </div>
              </div>

              {/* 네비게이션 링크 */}
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'products'
                      ? 'bg-gray-100 text-gray-900 border border-gray-900 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-medium">등록 상품</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('reviews')}reviews
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'reviews'
                      ? 'bg-gray-100 text-gray-900 border border-gray-900 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100/60'
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
            {/* {activeTab === 'products' && (
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
                            image: product.thumbnailUrl,
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
            )} */}

            {activeTab === 'products' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-[calc(100vh-100px)] flex flex-col overflow-hidden">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex-shrink-0">등록 상품</h3>

                {/* RegisteredProductList 그대로 삽입 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <UserProfileProductList
                    products={pageInfo.content}
                    currentPage={pageInfo.currentPage}
                    totalPages={pageInfo.totalPages}
                    onPageChange={(page) => setPageInfo(prev => ({ ...prev, currentPage: page }))}
                  />
                </div>
              </div>
            )}

            {/* 리뷰 섹션 */}
            {activeTab === 'reviews' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold text-gray-900">리뷰</h3>
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => handleReviewTabChange('borrowed')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        reviewTab === 'borrowed'
                          ? 'bg-gray-100 text-gray-900 shadow-sm border border-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      빌렸을 때
                    </button>
                    <button
                      onClick={() => handleReviewTabChange('lent')}
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

                {reviewPageInfo.content.length > 0 ? (
                  <>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      <div className="space-y-4 pr-2">
                        {reviewPageInfo.content.map((review) => (
                          <ReviewCard
                            key={review.id}
                            review={review}
                            showProductInfo={true}
                            showRating={true}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      {reviewPageInfo.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <button
                            disabled={reviewPageInfo.currentPage === 0}
                            onClick={() =>
                              setReviewPageInfo(prev => ({
                                ...prev,
                                currentPage: prev.currentPage - 1,
                              }))
                            }
                            className="px-3 py-1 bg-gray-200 rounded-lg"
                          >
                            이전
                          </button>

                          {Array.from({ length: reviewPageInfo.totalPages }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                setReviewPageInfo(prev => ({
                                  ...prev,
                                  currentPage: i,
                                }))
                              }
                              className={`px-3 py-1 rounded-lg ${
                                reviewPageInfo.currentPage === i
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-200"
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}

                          <button
                            disabled={
                              reviewPageInfo.currentPage >=
                              reviewPageInfo.totalPages - 1
                            }
                            onClick={() =>
                              setReviewPageInfo(prev => ({
                                ...prev,
                                currentPage: prev.currentPage + 1,
                              }))
                            }
                            className="px-3 py-1 bg-gray-200 rounded-lg"
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  </>
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

        </div>
      </div>
    </>
  );
};

export default UserProfilePage;
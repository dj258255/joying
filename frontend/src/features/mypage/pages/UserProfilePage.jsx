/**
 * UserProfilePage Component
 * 상대방 프로필 페이지 컴포넌트 (모던 디자인, 반응형)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';
import ProductCard from '../components/ProductCard';
import { DUMMY_USERS, DUMMY_PRODUCTS, DUMMY_REVIEWS } from '../../../shared/constants/dummyData';
import { chatApi } from '../../chat/api/chatApi';
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

  useEffect(() => {
    loadUserProfile();
  }, [memberId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      const foundUser = DUMMY_USERS.others.find(u => u.id === memberId);
      
      if (!foundUser) {
        navigate('/404');
        return;
      }
      setUser(foundUser);

      // 사용자 상품 로드
      const products = DUMMY_PRODUCTS.filter(p => p.sellerId === memberId);
      setUserProducts(products);

      // 사용자 리뷰 로드
      const reviews = DUMMY_REVIEWS.filter(r => r.reviewerId === memberId || r.revieweeId === memberId);
      setUserReviews(reviews);

    } catch (error) {
      console.error('사용자 프로필 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatClick = async () => {
    try {
      const chatRoomId = await chatApi.createChatRoom(memberId);
      navigate(`/chats/${chatRoomId}`);
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      alert('채팅방 생성에 실패했습니다.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getReviewType = (review) => {
    return review.reviewerId === memberId ? '빌려줬을 때' : '빌렸을 때';
  };

  const getFilteredReviews = () => {
    if (reviewTab === 'lent') {
      // 빌려줬을 때: 내가 빌려준 상품에 대한 리뷰 (내가 받은 리뷰)
      return userReviews.filter(r => r.revieweeId === memberId);
    } else {
      // 빌렸을 때: 내가 빌린 상품에 대한 리뷰 (내가 작성한 리뷰)
      return userReviews.filter(r => r.reviewerId === memberId);
    }
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
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 - 모바일 친화적 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">{user.nickname}</h1>
              </div>
              <button
                onClick={handleChatClick}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
              >
                채팅하기
              </button>
            </div>
          </div>
        </div>

        {/* 프로필 정보 섹션 */}
        <div className="bg-white">
          <div className="px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <ProfileImage 
                  src={user.profileImage}
                  alt={user.nickname}
                  size={100}
                  className="w-24 h-24 sm:w-28 sm:h-28"
                />
              </div>

              {/* 사용자 정보 */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.nickname}</h2>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">{user.bio || '소개가 없습니다.'}</p>
                
                {/* 통계 */}
                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto sm:mx-0">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{userProducts.length}</div>
                    <div className="text-xs text-gray-500">등록 상품</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{userReviews.length}</div>
                    <div className="text-xs text-gray-500">리뷰</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{user.rating}</div>
                    <div className="text-xs text-gray-500">평점</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              등록 상품
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              리뷰
            </button>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-4">
          {activeTab === 'products' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">등록 상품</h3>
              {userProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <div className="text-lg">등록된 상품이 없습니다.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">리뷰</h3>
              
              {/* 리뷰 서브 탭 */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setReviewTab('borrowed')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                    reviewTab === 'borrowed'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  빌렸을 때
                </button>
                <button
                  onClick={() => setReviewTab('lent')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                    reviewTab === 'lent'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  빌려줬을 때
                </button>
              </div>

              {/* 리뷰 목록 */}
              {getFilteredReviews().length > 0 ? (
                <div className="space-y-4">
                  {getFilteredReviews().map((review) => (
                    <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <ProfileImage 
                            src={review.reviewer.profileImage}
                            alt={review.reviewer.nickname}
                            size={40}
                            className="w-10 h-10"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">{review.reviewer.nickname}</div>
                            <div className="text-sm text-gray-500">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getReviewType(review) === '빌려줬을 때' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getReviewType(review)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
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
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed">{review.content}</p>
                      
                      {/* 상품 정보 표시 */}
                      {review.product && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <img
                              src={review.product.images?.[0]}
                              alt={review.product.title}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{review.product.title}</div>
                              <div className="text-sm text-gray-600">{review.product.price.toLocaleString()}원/일</div>
                            </div>
                            <button
                              onClick={() => navigate(`/products/${review.product.id}`)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              상품 보기
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {review.images && review.images.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {review.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`리뷰 이미지 ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">⭐</div>
                  <div className="text-lg">
                    {reviewTab === 'lent' ? '빌려줬을 때 리뷰가 없습니다.' : '빌렸을 때 리뷰가 없습니다.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfilePage;
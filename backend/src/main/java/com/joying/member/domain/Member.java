package com.joying.member.domain;

import com.joying.account.domain.Account;
import com.joying.common.entity.BaseEntity;
import com.joying.file.domain.File;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(
        name = "member",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_member_email", columnNames = {"email"})
        },
        indexes = {
                @Index(name = "idx_member_email", columnList = "email")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "memberId", callSuper=false)
public class Member extends BaseEntity {

    @Id
    @Column(name = "member_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long memberId;

    @Comment("계좌 목록")
    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Account> accounts = new ArrayList<>();

    @Comment("회원 닉네임 (Kakao OAuth에서 가져온 별명)")
    @Column(name = "nickname", nullable = false)
    private String nickname;

    @Comment("회원 실명 (1원 인증으로 확인된 실제 이름)")
    @Column(name = "name")
    private String name;

    @Comment("회원 이메일 (Kakao OAuth 식별자)")
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Comment("프로필 이미지")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    private File profileImage;

    @Comment("평점")
    @Column(name = "rating", nullable = false)
    private Double rating = 0.0;

    @Comment("평점 개수")
    @Column(name = "rating_count", nullable = false)
    private Integer ratingCount = 0;

    @Comment("SSAFY 금융망 USER KEY")
    @Column(name = "ssafy_user_key", unique = true)
    private String ssafyUserKey;

    @Comment("카카오 프로필 이미지 URL (카카오 로그인 시 저장, 사용자 업로드 이미지가 없을 때 사용)")
    @Column(name = "kakao_profile_image_url", length = 512)
    private String kakaoProfileImageUrl;

    /**
     * Kakao OAuth 회원 생성 (Builder 패턴)
     */
    @Builder
    public Member(String nickname, String name, String email, File profileImage, String kakaoProfileImageUrl) {
        this.nickname = nickname;
        this.name = name;
        this.email = email;
        this.profileImage = profileImage;
        this.kakaoProfileImageUrl = kakaoProfileImageUrl;
        this.rating = 0.0;
    }

    /**
     * 회원 정보 수정 (닉네임, 프로필 이미지)
     */
    public void updateProfile(String nickname, File profileImage) {
        if (nickname != null) {
            this.nickname = nickname;
        }
        if (profileImage != null) {
            this.profileImage = profileImage;
        }
    }

    /**
     * 프로필 이미지 완전 삭제
     * - 사용자 업로드 이미지 삭제
     * - 카카오 프로필 이미지 URL 삭제
     * → 기본 이미지로 완전 복원
     */
    public void deleteProfileImage() {
        this.profileImage = null;
        this.kakaoProfileImageUrl = null;
    }

    /**
     * 실명 업데이트 (1원 인증 완료 후)
     */
    public void updateRealName(String name) {
        this.name = name;
    }

    /**
     * SSAFY 금융망 USER KEY 저장
     */
    public void updateSsafyUserKey(String ssafyUserKey) {
        this.ssafyUserKey = ssafyUserKey;
    }

    /**
     * 평점 업데이트
     */
    public void updateRating(Float rating) {
        Double prevTotalRating = this.ratingCount * this.rating;
        Double totalRating = prevTotalRating + rating;
        this.ratingCount++;
        this.rating = Math.round((totalRating / this.ratingCount) * 10) / 10.0;
    }

    /**
     * 계좌 추가 (연관관계 편의 메서드)
     */
    public void addAccount(Account account) {
        if (account == null) {
            return;
        }
        this.accounts.add(account);
    }

    /**
     * 계좌 제거 (연관관계 편의 메서드)
     */
    public void removeAccount(Account account) {
        if (account == null) {
            return;
        }
        this.accounts.remove(account);
    }
}

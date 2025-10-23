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

    @Comment("회원 이름")
    @Column(name = "name", nullable = false)
    private String name;

    @Comment("회원 이메일 (Kakao OAuth 식별자)")
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Comment("프로필 이미지")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    private File profileImage;

    @Comment("평점")
    @Column(name = "rating")
    private Double rating;

    /**
     * Kakao OAuth 회원 생성 (Builder 패턴)
     */
    @Builder
    public Member(String name, String email, File profileImage) {
        this.name = name;
        this.email = email;
        this.profileImage = profileImage;
        this.rating = 0.0;
    }

    /**
     * 회원 정보 수정
     */
    public void updateProfile(String name, File profileImage) {
        this.name = name;
        if (profileImage != null) {
            this.profileImage = profileImage;
        }
    }

    /**
     * 평점 업데이트
     */
    public void updateRating(Double rating) {
        this.rating = rating;
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

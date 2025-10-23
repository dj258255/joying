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

    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Account> accounts = new ArrayList<>();

    @Comment("회원 이름")
    @Column(name = "name")
    private String name;

    @Comment("회원 이메일")
    @Column(name = "email")
    private String email;

    @Comment("프로필이미지")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fileId", nullable = true)
    private File profileImage;

    @Comment("평점")
    @Column(name = "rating")
    private Double rating;

    @Builder
    private Member(String name, String email, File profileImage, Double rating, List<Account> accounts) {
        this.name = name;
        this.email = email;
        this.profileImage = profileImage;
        this.rating = (rating != null) ? rating : 0.0; // 기본값 방어
        if (accounts != null) {
            this.accounts = accounts;
        }
    }
}

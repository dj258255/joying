package com.joying.member.domain;

import com.joying.account.domain.Account;
import com.joying.file.domain.File;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name="member")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "memberId", callSuper=false)
public class Member {

    @Id
    @Column(name = "member_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long memberId;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true)
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
    private File profile_image;

    @Comment("평점")
    @Column(name = "rating")
    private Double rating;
}

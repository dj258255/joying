package com.joying.account.domain;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * SSAFY 테스트 계좌 엔티티
 *
 * SSAFY 금융망 API를 통해 생성한 테스트 계좌 정보를 저장
 * (1원 인증 전 상태)
 */
@Getter
@Entity
@Table(name = "ssafy_account")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "ssafyAccountId", callSuper = false)
public class SsafyAccount extends BaseEntity {

    @Id
    @Column(name = "ssafy_account_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long ssafyAccountId;

    @Comment("회원")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Comment("상품 고유번호 (예: 004-1-001)")
    @Column(name = "account_type_unique_no", nullable = false, length = 20)
    private String accountTypeUniqueNo;

    @Comment("SSAFY 계좌번호 (16자리)")
    @Column(name = "account_no", nullable = false, length = 16, unique = true)
    private String accountNo;

    @Comment("은행 코드 (SSAFY 금융망)")
    @Column(name = "bank_code", nullable = false, length = 3)
    private String bankCode;

    @Comment("계좌 예금주명 (회원 실명 또는 미인증)")
    @Column(name = "account_holder_name", nullable = false)
    private String accountHolderName;

    @Comment("계좌 상태")
    @Enumerated(EnumType.STRING)
    @Column(name = "account_state", nullable = false, length = 20)
    private AccountState accountState;

    /**
     * Builder 패턴으로 SSAFY 계좌 생성
     */
    @Builder
    public SsafyAccount(Member member, String accountTypeUniqueNo, String accountNo,
                        String bankCode, String accountHolderName, AccountState accountState) {
        this.member = member;
        this.accountTypeUniqueNo = accountTypeUniqueNo;
        this.accountNo = accountNo;
        this.bankCode = bankCode;
        this.accountHolderName = accountHolderName;
        this.accountState = accountState != null ? accountState : AccountState.ACTIVE;
    }

    /**
     * 계좌 상태 업데이트
     *
     * @param accountState 새로운 계좌 상태
     */
    public void updateAccountState(AccountState accountState) {
        this.accountState = accountState;
    }

    /**
     * 연관관계 편의 메서드에서만 사용 (package-private)
     * 외부에서 직접 호출하지 말 것
     */
    void setMember(Member member) {
        this.member = member;
    }
}
package com.joying.account.domain;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.Instant;


@Getter
@Entity
@Table(name = "account")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "accountId", callSuper = false)
public class Account extends BaseEntity {

    @Id
    @Column(name = "account_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountId;

    @Comment("회원")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Comment("은행 이름 (SSAFY 금융망)")
    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Comment("은행 코드 (SSAFY 금융망)")
    @Column(name = "bank_code", nullable = false, length = 3)
    private String bankCode;

    @Comment("계좌 번호 (16자리)")
    @Column(name = "account_no", nullable = false, length = 16, unique = true)
    private String accountNo;

    @Comment("계좌 예금주명 (1원 인증으로 확인된 실명)")
    @Column(name = "account_holder_name", nullable = false)
    private String accountHolderName;

    @Comment("계좌 인증 완료 시간 (UTC) - null이면 미인증")
    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Comment("계좌 상태")
    @Enumerated(EnumType.STRING)
    @Column(name = "account_state", nullable = false, length = 20)
    private AccountState accountState;

    @Comment("계좌 잔액")
    @Column(name = "balance")
    private Long balance;

    /**
     * Builder 패턴으로 계좌 생성 (SSAFY 금융망 1원 인증 방식)
     */
    @Builder
    public Account(Member member, String bankName, String bankCode, String accountNo,
                   String accountHolderName, AccountState accountState, Long balance) {
        this.member = member;
        this.bankName = bankName;
        this.bankCode = bankCode;
        this.accountNo = accountNo;
        this.accountHolderName = accountHolderName;
        this.verifiedAt = null; // 기본값: 미인증 (1원 인증 완료 시 설정)
        this.accountState = accountState != null ? accountState : AccountState.ACTIVE;
        this.balance = balance != null ? balance : 0L;
    }

    /**
     * 계좌 인증 완료 처리 (UTC 기준 시간 저장)
     */
    public void verifyAccount() {
        this.verifiedAt = Instant.now(); // UTC 기준 현재 시간
    }

    /**
     * 계좌 인증 여부 확인
     *
     * @return verifiedAt이 null이 아니면 인증됨
     */
    public boolean isVerified() {
        return this.verifiedAt != null;
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
     * 계좌 사용 가능 여부 확인
     *
     * @return 정상 상태 && 인증 완료 여부
     */
    public boolean isUsable() {
        return isVerified() && this.accountState.isActive();
    }

    /**
     * 연관관계 편의 메서드에서만 사용 (package-private)
     * 외부에서 직접 호출하지 말 것
     */
    void setMember(Member member) {
        this.member = member;
    }
}

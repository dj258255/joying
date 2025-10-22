package com.joying.account.domain;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(
        name = "account",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_account_banknum",
                        columnNames = {"bank_name", "account_num"}
                )
        },
        indexes = {
                @Index(name = "idx_account_banknum", columnList = "bank_name, account_num")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "accountId", callSuper=false)
public class Account extends BaseEntity {

    @Id
    @Column(name = "account_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "bank_name", nullable = false, length = 20)
    private BankCode bankName;

    @Comment("계좌 번호")
    @Column(name = "account_num")
    private String accountNum;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", referencedColumnName = "member_id", nullable = false)
    private Member member;

    @Builder
    private Account(BankCode bankName, String accountNum) {
        this.bankName = bankName;
        this.accountNum = accountNum;
    }
}

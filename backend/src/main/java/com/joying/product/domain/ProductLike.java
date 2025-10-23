package com.joying.product.domain;

import com.joying.common.entity.BaseEntity;
import com.joying.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Entity
@Table(
        name = "product_like",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_product_like_member_product", columnNames = {"member_id", "product_id"})
        },
        indexes = {
                @Index(name = "idx_product_like_member", columnList = "member_id"),
                @Index(name = "idx_product_like_product", columnList = "product_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "productLikeId", callSuper=false)
public class ProductLike extends BaseEntity {

    @Id
    @Column(name = "product_like_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productLikeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Builder
    private ProductLike(Product product, Member member) {
        this.product = product;
        this.member = member;
    }
}

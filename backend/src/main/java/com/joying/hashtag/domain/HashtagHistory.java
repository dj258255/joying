package com.joying.hashtag.domain;

import com.joying.category.domain.Category;
import com.joying.common.entity.BaseEntity;
import com.joying.product.domain.Product;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Entity
@Table(
        name = "hashtag_history",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_hashtag_history_product_hashtag", columnNames = {"product_id", "hashtag_id"})
        },
        indexes = {
                @Index(name = "idx_hashtag_history_product", columnList = "product_id"),
                @Index(name = "idx_hashtag_history_hashtag", columnList = "hashtag_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "hashtagHisId", callSuper=false)
public class HashtagHistory extends BaseEntity {

    @Id
    @Column(name = "hashtag_his_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long hashtagHisId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hashtag_id")
    private Hashtag hashtag;

    @Builder
    private HashtagHistory(Product product, Hashtag hashtag) {
        this.product = product;
        this.hashtag = hashtag;
    }
}

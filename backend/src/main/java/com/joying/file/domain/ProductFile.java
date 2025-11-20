package com.joying.file.domain;

import com.joying.common.entity.BaseEntity;
import com.joying.product.domain.Product;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(
        name = "product_file",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_product_file_product_file", columnNames = {"product_id", "file_id"})
        },
        indexes = {
                @Index(name = "idx_product_file_product", columnList = "product_id"),
                @Index(name = "idx_product_file_file", columnList = "file_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "productFileId", callSuper=false)
public class ProductFile extends BaseEntity {

    @Id
    @Column(name = "product_file_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productFileId;

    @Comment("물품")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "productId", referencedColumnName = "product_id", nullable = true)
    private Product product;

    @Comment("파일")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fileId", referencedColumnName = "file_id", nullable = false)
    private File file;

    @Comment("썸네일 여부")
    @Column(name = "is_thumbnail", nullable = false)
    private boolean isThumbnail = false;

    @Comment("정렬 순서 (작을수록 먼저)")
    @Column(name = "sort_order")
    private Integer sortOrder;

    @Builder
    private ProductFile(Product product, File file, boolean isThumbnail, Integer sortOrder) {
        this.product = product;
        this.file = file;
        this.isThumbnail = isThumbnail;
        this.sortOrder = sortOrder;
    }
}

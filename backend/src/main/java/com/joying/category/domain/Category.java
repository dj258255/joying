package com.joying.category.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(
        name = "category",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_category_parent_name",
                        columnNames = {"parent_id", "category_name"}
                )
        },
        indexes = {
                @Index(name = "idx_category_parent", columnList = "parent_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "categoryId", callSuper=false)
public class Category {

    @Id
    @Column(name = "category_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long categoryId;

    @Comment("상위 카테고리")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", referencedColumnName = "category_id")
    private Category parent;

    @Comment("카테고리 이름")
    @Column(name = "category_name")
    private String categoryName;

    @Comment("카테고리 레벨")
    @Column(name = "category_level")
    private Integer categoryLevel;

    @Builder
    private Category(Category parent, String categoryName, Integer categoryLevel) {
        this.parent = parent;
        this.categoryName = categoryName;
        this.categoryLevel = categoryLevel;
    }

}

package com.joying.hashtag.domain;

import com.joying.category.domain.Category;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="hashtag")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "hashtagId", callSuper=false)
public class Hashtag {

    @Id
    @Column(name = "hashtag_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long hashtagId;

    @Comment("해시태그 이름")
    @Column(name = "hashtag_name")
    private String hashtagName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoryId", referencedColumnName = "category_id")
    private Category category;

    @Builder
    private Hashtag(String hashtagName, Category category) {
        this.hashtagName = hashtagName;
        this.category = category;
    }
}

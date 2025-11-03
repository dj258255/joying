package com.joying.product.domain;

import com.joying.category.domain.Category;
import com.joying.common.entity.BaseEntity;
import com.joying.hashtag.domain.HashtagHistory;
import com.joying.member.domain.Member;
import com.joying.region.domain.Dong;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Sido;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name="product")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "productId", callSuper=false)
public class Product extends BaseEntity {

    @Id
    @Column(name = "product_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productId;

    @Comment("작성자")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId", nullable = false)
    private Member writer;

    @Comment("등록 타입")
    @Enumerated(value=EnumType.STRING)
    @Column(name = "upload_type")
    private UploadType uploadType;

    @Comment("보증금")
    @Column(name = "deposit")
    private Integer deposit;

    @Comment("일일 대여 요금")
    @Column(name = "rental_fee")
    private Integer rentalFee;

    @Comment("제목")
    @Column(name = "title")
    private String title;

    @Comment("내용")
    @Column(name = "content")
    private String content;

    @Comment("위치(시도)")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sidoId", nullable = true)
    private Sido sido;

    @Comment("위치(군구)")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gunguId", nullable = true)
    private Gungu gungu;

    @Comment("위치(동)")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dongId", nullable = true)
    private Dong dong;

    @Comment("거래 방법")
    // 2025-10-30: DB에서 소문자로 저장되는 문제 해결을 위해 Converter 사용
     @Enumerated(value=EnumType.STRING)
//    @Convert(converter = RentMethodConverter.class)
    @Column(name = "rent_method")
    private RentMethod rentMethod;

    @Comment("촬영 필수 여부")
    @Column(name = "video_necessary")
    private Boolean videoNecessary;

    @Comment("카테고리ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoryId", nullable = true)
    private Category category;

    @Comment("해시태그 내역")
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HashtagHistory> hashtagHistory = new ArrayList<>();

    @Comment("대여 가능 시작 날짜")
    @Column(name = "start_rent")
    private Instant startRent;

    @Comment("대여 가능 종료 날짜")
    @Column(name = "end_rent")
    private Instant endRent;

    @Comment("평점")
    @Column(name = "rating")
    private Double rating;

    @Builder
    private Product(Member writer,
                    UploadType uploadType,
                    Integer deposit,
                    Integer rentalFee,
                    String title,
                    String content,
                    Sido sido,
                    Gungu gungu,
                    Dong dong,
                    RentMethod rentMethod,
                    Boolean videoNecessary,
                    Category category,
                    Instant startRent,
                    Instant endRent,
                    Double rating) {

        this.writer = writer;
        this.uploadType = uploadType;
        this.deposit = deposit;
        this.rentalFee = rentalFee;
        this.title = title;
        this.content = content;
        this.sido = sido;
        this.gungu = gungu;
        this.dong = dong;
        this.rentMethod = rentMethod;
        this.videoNecessary = videoNecessary;
        this.category = category;
        this.startRent = startRent;
        this.endRent = endRent;
        this.rating = (rating != null) ? rating : 0.0;
    }

    public void updateProductInfo(String title, String content, Integer deposit, Integer rentalFee,
                                  UploadType uploadType, RentMethod rentMethod, Boolean videoNecessary,
                                  Category category, Sido sido, Gungu gungu, Dong dong,
                                  Instant startRent, Instant endRent) {

        if (title != null) this.title = title;
        if (content != null) this.content = content;
        if (deposit != null) this.deposit = deposit;
        if (rentalFee != null) this.rentalFee = rentalFee;
        if (uploadType != null) this.uploadType = uploadType;
        if (rentMethod != null) this.rentMethod = rentMethod;
        if (videoNecessary != null) this.videoNecessary = videoNecessary;
        if (category != null) this.category = category;
        if (sido != null) this.sido = sido;
        if (gungu != null) this.gungu = gungu;
        if (dong != null) this.dong = dong;
        if (startRent != null) this.startRent = startRent;
        if (endRent != null) this.endRent = endRent;
    }

}
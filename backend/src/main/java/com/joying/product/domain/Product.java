package com.joying.product.domain;

import com.joying.category.domain.Category;
import com.joying.member.domain.Member;
import com.joying.region.domain.Dong;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Sido;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;

@Getter
@Entity
@Table(name="product")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "productId", callSuper=false)
public class Product {

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
    @Column(name = "deposite")
    private Integer deposit;

    @Comment("일일 대여 요금")
    @Column(name = "rental_fee")
    private Integer retalFee;

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
    @Enumerated(value=EnumType.STRING)
    @Column(name = "rent_method")
    private RentMethod rentMethod;

    @Comment("촬영 필수 여부")
    @Column(name = "video_necessary")
    private Boolean videoNecessary;

    @Comment("카테고리ID")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoryId", nullable = true)
    private Category category;

    @Comment("대여 가능 시작 날짜")
    @Column(name = "start_ren")
    private Timestamp startRen;

    @Comment("대여 가능 종료 날짜")
    @Column(name = "end_ren")
    private Timestamp endRen;

    @Comment("평점")
    @Column(name = "rating")
    private Double rating;
}

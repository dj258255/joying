package com.joying.product.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;
import java.time.Instant;

@Getter
@Entity
@Table(
        name="rental_refuse",
        indexes = {
                @Index(name = "idx_rental_refuse_product", columnList = "product_id"),
                @Index(name = "idx_rental_refuse_range", columnList = "start_ref, end_ref")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "rentalRefuseId", callSuper=false)
public class RentalRefuse {

    @Id
    @Column(name = "rental_refuse_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rentalRefuseId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Comment("대여불가 시작 날짜")
    @Column(name = "start_ref")
    private Instant startRef;

    @Comment("대여불가 종료 날짜")
    @Column(name = "end_ref")
    private Instant endRef;

    @Builder
    private RentalRefuse(Product product, Instant startRef, Instant endRef) {
        this.product = product;
        this.startRef = startRef;
        this.endRef = endRef;
    }
}

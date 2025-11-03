package com.joying.rental.domain;

import com.joying.file.domain.File;
import com.joying.member.domain.Member;
import com.joying.product.domain.Product;
import com.joying.product.domain.RentMethod;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.sql.Timestamp;

@Getter
@Entity
@Table(name = "rental_video")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "rentalVideoId", callSuper = false)
public class RentalVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rental_video_id")
    @Comment("거래영상ID")
    private Long rentalVideoId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    @Comment("파일ID")
    private File file;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_his_id", nullable = false)
    @Comment("거래내역ID")
    private RentalHistory rentalHistory;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_type", nullable = false, length = 30)
    @Comment("영상타입(owner_send, renter_receive, renter_return, owner_receive)")
    private VideoType videoType;

    @Builder
    private RentalVideo(File file, RentalHistory rentalHistory, VideoType videoType) {
        this.file = file;
        this.rentalHistory = rentalHistory;
        this.videoType = videoType;
    }
}

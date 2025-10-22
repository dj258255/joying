package com.joying.region.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="dong")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "dongId", callSuper=false)
public class Dong {

    @Id
    @Column(name = "dong_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long dongId;

    @Comment("동 명")
    @Column(name = "name")
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gunguId", nullable = false)
    private Gungu gungu;
}

package com.joying.region.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="gungu")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "gunguId", callSuper=false)
public class Gungu {

    @Id
    @Column(name = "gungu_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long gunguId;

    @Comment("군구 명")
    @Column(name = "name")
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sidoId", nullable = false)
    private Sido sido;
}

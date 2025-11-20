package com.joying.region.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="sido")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "sidoId", callSuper=false)
public class Sido {

    @Id
    @Column(name = "sido_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sidoId;

    @Comment("시도 명")
    @Column(name = "name")
    private String name;

    @Builder
    private Sido(String name) {
        this.name = name;
    }
}

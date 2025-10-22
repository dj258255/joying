package com.joying.file.domain;

import jakarta.json.Json;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="file")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "fileId", callSuper=false)
public class File {

    @Id
    @Column(name = "file_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long fileId;

    @Comment("파일 명")
    @Column(name = "file_name")
    private String fileName;

    @Comment("디렉토리 구조")
    @Column(name = "directory")
    private String directory;

    @Comment("파일 정보")
    @Column(name = "metadata")
    private String metadata; //json 자체를 기본 데이터 타입으로 저장할 수 없어서 우선 string으로 저장 후 변환

}

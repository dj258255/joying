package com.joying.file.domain;

import com.joying.common.entity.BaseEntity;
import jakarta.json.Json;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(
        name = "file",
        indexes = {
                @Index(name = "idx_file_directory", columnList = "directory"),
                @Index(name = "idx_file_name", columnList = "file_name")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "fileId", callSuper=false)
public class File extends BaseEntity {

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
    // PostgreSQL 은 jsonb 를 쓴다. 값을 파싱해 저장하므로 색인을 걸 수 있고 조회가 빠르다.
    // MySQL 의 JSON 과 이름만 다른 것이 아니라 성질이 다르다
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @Builder
    private File(String fileName, String directory, String metadata) {
        this.fileName = fileName;
        this.directory = directory;
        this.metadata = metadata;
    }

}

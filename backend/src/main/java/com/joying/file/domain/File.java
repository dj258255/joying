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
    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @Builder
    private File(String fileName, String directory, String metadata) {
        this.fileName = fileName;
        this.directory = directory;
        this.metadata = metadata;
    }

}

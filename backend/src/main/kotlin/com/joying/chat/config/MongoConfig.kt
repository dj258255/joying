package com.joying.chat.config

import com.joying.chat.document.ChatMessage
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.mongodb.MongoDatabaseFactory
import org.springframework.data.mongodb.config.EnableMongoAuditing
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper
import org.springframework.data.mongodb.core.convert.MappingMongoConverter
import org.springframework.data.mongodb.core.index.Index
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories
import org.springframework.data.domain.Sort

/**
 * MongoDB Blocking 설정
 *
 * 채팅 메시지 저장용 NoSQL 설정
 * - 블로킹 MongoDB. 서비스에서 그대로 부른다
 * - MongoDB Auditing 활성화 (@CreatedDate 자동 설정)
 * - _class 필드 제거 (불필요한 메타데이터 저장 방지)
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = ["com.joying.chat.repository"])
class MongoConfig {
    private val logger = LoggerFactory.getLogger(MongoConfig::class.java)

    /**
     * MongoTemplate 설정
     *
     * _class 필드를 제거하여 MongoDB 문서에 Java 클래스 정보를 저장하지 않음
     * 이를 통해 문서 크기를 줄이고 가독성을 높임
     */
    @Bean
    fun mongoTemplate(
        mongoDatabaseFactory: MongoDatabaseFactory,
        mappingMongoConverter: MappingMongoConverter
    ): MongoTemplate {
        // _class 필드 제거
        mappingMongoConverter.setTypeMapper(DefaultMongoTypeMapper(null))

        val template = MongoTemplate(mongoDatabaseFactory, mappingMongoConverter)

        // 인덱스 초기화
        initIndexes(template)

        return template
    }

    /**
     * MongoDB 인덱스 초기화
     *
     * 애플리케이션 시작 시 필요한 인덱스를 만든다.
     *
     * ensureIndex는 없을 때만 만들므로 여러 번 불러도 안전하다. 예전에는 기동할 때마다
     * _id를 뺀 인덱스를 전부 지우고 다시 만들었는데, 그러면 배포할 때마다 인덱스가
     * 사라졌다가 다시 쌓이는 동안 조회가 전부 컬렉션 스캔으로 돈다.
     */
    private fun initIndexes(mongoTemplate: MongoTemplate) {
        try {
            // 컬렉션 이름을 문자열로 적으면 @Document의 이름과 어긋나도 아무 신호가 없다.
            // 실제로 "chatMessages"로 적혀 있어 아래 인덱스가 전부 없는 컬렉션에 만들어지고 있었다.
            // 엔티티에서 이름을 받아 두 곳이 갈라질 수 없게 한다.
            val indexOps = mongoTemplate.indexOps(ChatMessage::class.java)

            // 1. 안읽은 메시지 카운트 쿼리 최적화 (P0 - Critical)
            // countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot
            // 복합 인덱스: chatRoomId + isDeleted + createdAt + senderId
            indexOps.ensureIndex(
                Index()
                    .on("chatRoomId", Sort.Direction.ASC)
                    .on("isDeleted", Sort.Direction.ASC)
                    .on("createdAt", Sort.Direction.ASC)
                    .on("senderId", Sort.Direction.ASC)
                    .named("idx_unread_count")
            )

            // 2. 메시지 목록 조회 최적화 (DESC)
            // findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc
            // findByChatRoomIdAndIsDeletedFalseAndCreatedAtBeforeOrderByCreatedAtDesc (커서 페이징도 커버)
            indexOps.ensureIndex(
                Index()
                    .on("chatRoomId", Sort.Direction.ASC)
                    .on("isDeleted", Sort.Direction.ASC)
                    .on("createdAt", Sort.Direction.DESC)
                    .named("idx_message_list_desc")
            )

            // 3. 재연결 시 놓친 메시지 조회 최적화 (ASC)
            // findByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtAsc
            indexOps.ensureIndex(
                Index()
                    .on("chatRoomId", Sort.Direction.ASC)
                    .on("isDeleted", Sort.Direction.ASC)
                    .on("createdAt", Sort.Direction.ASC)
                    .named("idx_missed_messages_asc")
            )

            logger.info("MongoDB 인덱스 초기화 완료: {}", mongoTemplate.getCollectionName(ChatMessage::class.java))
        } catch (e: Exception) {
            logger.error("MongoDB 인덱스 초기화 실패: ${e.message}", e)
        }
    }
}
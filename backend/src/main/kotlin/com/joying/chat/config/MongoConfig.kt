package com.joying.chat.config

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
 * - Blocking MongoDB + Coroutine withContext(Dispatchers.IO) 패턴 (현업 표준)
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
     * 애플리케이션 시작 시 필요한 인덱스를 자동으로 생성
     * 기존 인덱스가 있으면 삭제 후 재생성
     */
    private fun initIndexes(mongoTemplate: MongoTemplate) {
        try {
            val indexOps = mongoTemplate.indexOps("chatMessages")

            // 기존 인덱스 목록 조회
            val existingIndexes = indexOps.indexInfo

            // 모든 인덱스 삭제 (_id 인덱스 제외)
            existingIndexes.forEach { indexInfo ->
                val indexName = indexInfo.name
                if (indexName != "_id_") {
                    try {
                        indexOps.dropIndex(indexName)
                        logger.debug("기존 인덱스 삭제: {}", indexName)
                    } catch (e: Exception) {
                        logger.warn("인덱스 삭제 실패 (무시): {} - {}", indexName, e.message)
                    }
                }
            }

            // 1. 안읽은 메시지 카운트 쿼리 최적화 (P0 - Critical)
            // countByChatRoomIdAndIsDeletedFalseAndCreatedAtAfterAndSenderIdNot
            // 복합 인덱스: chatRoomId + isDeleted + createdAt + senderId
            // 예상 성능 개선: 500ms → 5ms (100배 향상)
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

            logger.info("MongoDB 인덱스 초기화 완료 (chatMessages)")
        } catch (e: Exception) {
            logger.error("MongoDB 인덱스 초기화 실패: ${e.message}", e)
        }
    }
}
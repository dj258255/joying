package com.joying.chat.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.mongodb.MongoDatabaseFactory
import org.springframework.data.mongodb.config.EnableMongoAuditing
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper
import org.springframework.data.mongodb.core.convert.MappingMongoConverter
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories

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

        return MongoTemplate(mongoDatabaseFactory, mappingMongoConverter)
    }
}
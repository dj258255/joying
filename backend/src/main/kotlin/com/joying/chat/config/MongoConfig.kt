package com.joying.chat.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.mongodb.ReactiveMongoDatabaseFactory
import org.springframework.data.mongodb.config.EnableReactiveMongoAuditing
import org.springframework.data.mongodb.core.ReactiveMongoTemplate
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper
import org.springframework.data.mongodb.core.convert.MappingMongoConverter
import org.springframework.data.mongodb.repository.config.EnableReactiveMongoRepositories

/**
 * MongoDB Reactive 설정
 *
 * 채팅 메시지 저장용 NoSQL 설정
 * - Reactive MongoDB (코루틴 지원)
 * - MongoDB Auditing 활성화 (@CreatedDate 자동 설정)
 * - _class 필드 제거 (불필요한 메타데이터 저장 방지)
 */
@Configuration
@EnableReactiveMongoAuditing
@EnableReactiveMongoRepositories(basePackages = ["com.joying.chat.repository"])
class MongoConfig {

    /**
     * ReactiveMongoTemplate 설정
     *
     * _class 필드를 제거하여 MongoDB 문서에 Java 클래스 정보를 저장하지 않음
     * 이를 통해 문서 크기를 줄이고 가독성을 높임
     */
    @Bean
    fun reactiveMongoTemplate(
        reactiveMongoDatabaseFactory: ReactiveMongoDatabaseFactory,
        mappingMongoConverter: MappingMongoConverter
    ): ReactiveMongoTemplate {
        // _class 필드 제거
        mappingMongoConverter.setTypeMapper(DefaultMongoTypeMapper(null))

        return ReactiveMongoTemplate(reactiveMongoDatabaseFactory, mappingMongoConverter)
    }
}
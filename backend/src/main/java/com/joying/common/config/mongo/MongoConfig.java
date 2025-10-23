package com.joying.common.config.mongo;

import org.springframework.context.annotation.Configuration;

/**
 * MongoDB 설정 (스켈레톤)
 *
 * 향후 채팅 메시지, 대화 기록 등 NoSQL 데이터 저장에 사용 예정
 *
 * 사용 시 아래 설정을 활성화:
 * 1. @EnableMongoRepositories(basePackages = "com.joying.*.repository.mongo")
 * 2. MongoTemplate Bean 설정
 * 3. application.properties에 MongoDB 연결 정보 추가
 */
@Configuration
public class MongoConfig {

    // TODO: MongoDB 사용 시 아래 설정 활성화

    /*
    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory,
                                       MongoMappingContext mongoMappingContext) {

        MappingMongoConverter converter = new MappingMongoConverter(
                new DefaultDbRefResolver(mongoDatabaseFactory),
                mongoMappingContext
        );

        // _class 필드 제거 (MongoDB 문서에 Java 클래스 정보 저장하지 않음)
        converter.setTypeMapper(new DefaultMongoTypeMapper(null));

        return new MongoTemplate(mongoDatabaseFactory, converter);
    }
    */
}
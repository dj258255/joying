package com.joying.chat.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import com.joying.chat.document.ChatMessage;

/**
 * MongoDB 설정.
 *
 * <p>블로킹이다. 서비스에서 그대로 부른다.
 *
 * <p>{@code _class} 필드를 빼서 문서에 자바 클래스 이름을 저장하지 않는다. 문서가
 * 작아지고, 클래스를 옮겨도 읽을 수 있다.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.joying.chat.repository")
public class MongoConfig {

	private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

	@Bean
	public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory,
									   MappingMongoConverter mappingMongoConverter) {
		mappingMongoConverter.setTypeMapper(new DefaultMongoTypeMapper(null));

		MongoTemplate template = new MongoTemplate(mongoDatabaseFactory, mappingMongoConverter);
		initIndexes(template);
		return template;
	}

	/**
	 * 애플리케이션 시작 시 필요한 인덱스를 만든다.
	 *
	 * <p>ensureIndex는 없을 때만 만드므로 여러 번 불러도 안전하다. 예전에는 기동할
	 * 때마다 _id를 뺀 인덱스를 전부 지우고 다시 만들었는데, 그러면 배포할 때마다
	 * 인덱스가 사라졌다가 다시 쌓이는 동안 조회가 전부 컬렉션 스캔으로 돈다.
	 *
	 * <p>컬렉션 이름을 문자열로 적으면 {@code @Document}의 이름과 어긋나도 아무 신호가
	 * 없다. 실제로 어긋나 있어서 인덱스가 전부 없는 컬렉션에 만들어지고 있었다.
	 * 엔티티에서 이름을 받아 두 곳이 갈라질 수 없게 한다.
	 */
	private void initIndexes(MongoTemplate mongoTemplate) {
		try {
			IndexOperations indexOps = mongoTemplate.indexOps(ChatMessage.class);

			// 안읽음 개수를 셀 때 쓴다
			indexOps.ensureIndex(new Index()
				.on("chatRoomId", Sort.Direction.ASC)
				.on("isDeleted", Sort.Direction.ASC)
				.on("createdAt", Sort.Direction.ASC)
				.on("senderId", Sort.Direction.ASC)
				.named("idx_unread_count"));

			// 메시지 목록과 커서 페이징에 쓴다
			indexOps.ensureIndex(new Index()
				.on("chatRoomId", Sort.Direction.ASC)
				.on("isDeleted", Sort.Direction.ASC)
				.on("createdAt", Sort.Direction.DESC)
				.named("idx_message_list_desc"));

			// 재접속했을 때 놓친 메시지를 받는 데 쓴다
			indexOps.ensureIndex(new Index()
				.on("chatRoomId", Sort.Direction.ASC)
				.on("isDeleted", Sort.Direction.ASC)
				.on("createdAt", Sort.Direction.ASC)
				.named("idx_missed_messages_asc"));

			log.info("MongoDB 인덱스 초기화 완료: {}",
				mongoTemplate.getCollectionName(ChatMessage.class));
		} catch (Exception e) {
			// 인덱스를 못 만들어도 애플리케이션은 떠야 한다. 느릴 뿐 동작은 한다.
			log.error("MongoDB 인덱스 초기화 실패", e);
		}
	}
}

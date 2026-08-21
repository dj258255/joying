package com.joying.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.core.index.Index;
import org.testcontainers.containers.MongoDBContainer;

import com.joying.chat.document.ChatMessage;

/**
 * 채팅 메시지 인덱스가 실제 컬렉션에 붙는지 확인한다.
 *
 * <p>인덱스를 만드는 코드는 컬렉션 이름을 문자열 {@code "chatMessages"}로 적고 있었고,
 * 엔티티는 {@code chat_messages}에 저장하고 있었다. 두 이름이 어긋나면 인덱스는
 * 아무 오류 없이 존재하지 않는 컬렉션에 만들어진다. 그 사실을 이 테스트로 고정한다.
 */
class ChatMessageIndexTest {

	private static MongoDBContainer mongo;
	private static MongoTemplate mongoTemplate;

	@BeforeAll
	static void startMongo() {
		mongo = new MongoDBContainer("mongo:7.0");
		mongo.start();
		mongoTemplate = new MongoTemplate(
			new SimpleMongoClientDatabaseFactory(mongo.getConnectionString() + "/joying_test"));
	}

	@AfterAll
	static void stopMongo() {
		if (mongo != null) {
			mongo.stop();
		}
	}

	@Test
	@DisplayName("엔티티에서 컬렉션 이름을 받으면 @Document가 가리키는 chat_messages에 인덱스가 붙는다")
	void indexLandsOnTheCollectionEntityWritesTo() {
		mongoTemplate.indexOps(ChatMessage.class).ensureIndex(
			new Index()
				.on("chatRoomId", Sort.Direction.ASC)
				.on("isDeleted", Sort.Direction.ASC)
				.on("createdAt", Sort.Direction.ASC)
				.named("idx_unread_count"));

		assertThat(mongoTemplate.getCollectionName(ChatMessage.class)).isEqualTo("chat_messages");
		assertThat(indexNamesOf("chat_messages")).contains("idx_unread_count");
	}

	@Test
	@DisplayName("컬렉션 이름을 문자열로 적으면 오류 없이 다른 컬렉션에 인덱스가 만들어진다")
	void wrongNameSilentlyCreatesAnotherCollection() {
		mongoTemplate.indexOps("chatMessages").ensureIndex(
			new Index().on("chatRoomId", Sort.Direction.ASC).named("idx_typo"));

		// 예외가 나지 않는다. 그래서 이 오타는 기동 로그만 봐서는 드러나지 않았다.
		assertThat(indexNamesOf("chatMessages")).contains("idx_typo");
		assertThat(indexNamesOf("chat_messages")).doesNotContain("idx_typo");
	}

	private List<String> indexNamesOf(String collection) {
		return mongoTemplate.getCollection(collection)
			.listIndexes()
			.map(Document.class::cast)
			.map(d -> d.getString("name"))
			.into(new java.util.ArrayList<>());
	}
}

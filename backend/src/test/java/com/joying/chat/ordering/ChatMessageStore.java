package com.joying.chat.ordering;

import java.util.Map;

import javax.sql.DataSource;

import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.hibernate5.HibernateExceptionTranslator;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import com.joying.chat.repository.ChatMessageRepository;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import jakarta.persistence.EntityManagerFactory;

/**
 * 실제 PostgreSQL 위에 채팅 메시지 저장소만 세운다.
 *
 * <p>스프링 컨텍스트를 통째로 띄우지 않는 이유는 두 가지다. 뜨는 데 오래 걸리고,
 * {@code @DataJpaTest} 는 테스트마다 트랜잭션을 열어 되돌리는데 동시성 실험은 실제로
 * 커밋된 것을 여러 스레드가 봐야 한다.
 *
 * <p>조건부 유니크 인덱스를 여기서 만든다. 스키마는 Hibernate 가 만들지만 조건이 붙은
 * 인덱스는 만들지 못한다. 운영에서 기동할 때 만드는 것과 같은 문장을 쓴다.
 */
public final class ChatMessageStore implements AutoCloseable {

	private final PostgreSQLContainer<?> postgres;
	private final HikariDataSource dataSource;
	private final EntityManagerFactory entityManagerFactory;

	private final ChatMessageRepository repository;
	private final JdbcTemplate jdbc;
	private final TransactionTemplate transactionTemplate;

	public ChatMessageStore() {
		postgres = new PostgreSQLContainer<>("postgres:16-alpine");
		postgres.start();

		HikariConfig config = new HikariConfig();
		config.setJdbcUrl(postgres.getJdbcUrl());
		config.setUsername(postgres.getUsername());
		config.setPassword(postgres.getPassword());
		// 동시성 실험이 스레드를 여럿 쓴다. 풀이 좁으면 재는 것이 경합이 아니라 대기가 된다
		config.setMaximumPoolSize(32);
		dataSource = new HikariDataSource(config);

		LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
		factory.setDataSource(dataSource);
		factory.setPackagesToScan("com.joying.chat.document");
		factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
		factory.setJpaPropertyMap(Map.of(
			"hibernate.hbm2ddl.auto", "create",
			"hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect"));
		factory.afterPropertiesSet();
		entityManagerFactory = factory.getObject();

		JpaTransactionManager txManager = new JpaTransactionManager(entityManagerFactory);
		transactionTemplate = new TransactionTemplate(txManager);

		// 트랜잭션에 참여하는 EntityManager 를 쓴다. 원시 EntityManager 를 주면 스레드마다
		// 다른 컨텍스트를 봐서 트랜잭션 경계가 무의미해진다
		repository = new JpaRepositoryFactory(
			SharedEntityManagerCreator.createSharedEntityManager(entityManagerFactory))
			.getRepository(ChatMessageRepository.class);

		jdbc = new JdbcTemplate(dataSource);
		createPartialUniqueIndex();
	}

	/**
	 * 값이 있을 때만 제약을 건다.
	 *
	 * <p>조건 없이 걸면 식별자가 빈 두 건이 서로 부딪힌다. 문서 저장소를 쓰던 때
	 * {@code sparse} 로 같은 함정을 밟았다.
	 */
	private void createPartialUniqueIndex() {
		jdbc.execute("""
			CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_message_client_id
			ON chat_message (chat_room_id, client_message_id)
			WHERE client_message_id IS NOT NULL
			""");
	}

	public ChatMessageRepository repository() {
		return repository;
	}

	/**
	 * 한 트랜잭션으로 묶어 실행한다.
	 *
	 * <p>공유 EntityManager 는 트랜잭션 안에서만 열린다. 스레드마다 자기 트랜잭션을
	 * 열어야 동시성을 잰다.
	 *
	 * <p>제약 위반을 Spring 예외로 바꿔 준다. 저장소를 스프링이 만들면 그 변환이 자동으로
	 * 붙지만, 여기서는 직접 세웠으므로 Hibernate 예외가 그대로 올라온다. 테스트가 잡을
	 * 예외가 운영과 달라지면 무엇을 재는지 흐려진다.
	 */
	public <T> T inTransaction(java.util.function.Function<ChatMessageRepository, T> work) {
		try {
			return transactionTemplate.execute(status -> work.apply(repository));
		} catch (RuntimeException e) {
			DataAccessException translated = EXCEPTION_TRANSLATOR.translateExceptionIfPossible(e);
			throw translated != null ? translated : e;
		}
	}

	/** Hibernate 예외를 Spring 예외로 바꾼다 */
	private static final HibernateExceptionTranslator EXCEPTION_TRANSLATOR =
		new HibernateExceptionTranslator();

	/** 읽기 전용으로 한 번 감싼다. 조회도 EntityManager 가 열려 있어야 한다 */
	public <T> T read(java.util.function.Function<ChatMessageRepository, T> work) {
		return inTransaction(work);
	}

	public void clear() {
		jdbc.update("DELETE FROM chat_message");
	}

	@Override
	public void close() {
		dataSource.close();
		postgres.stop();
	}
}

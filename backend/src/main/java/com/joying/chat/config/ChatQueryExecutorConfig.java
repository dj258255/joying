package com.joying.chat.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 서로 의존하지 않는 조회를 동시에 날릴 때 쓰는 풀.
 *
 * <p>방 목록을 열면 방마다 안읽음을 세야 한다. 순차로 하면 방 수만큼 지연이 더해지고,
 * 동시에 하면 제일 느린 것만큼만 걸린다.
 *
 * <p>예전에는 이 자리를 코루틴이 맡았다. 그런데 밑에 있는 저장소가 전부 블로킹이라
 * 코루틴이 사 주는 것이 없었고, 오히려 톰캣 워커를 잡아 둔 채 IO 스레드를 하나 더
 * 쓰고 있었다. 병렬로 날리는 것만 남기고 나머지는 걷어냈다.
 *
 * <p>풀 크기를 묶어 둔 이유는 밑이 블로킹이기 때문이다. 무제한으로 늘리면 방이 많은
 * 사용자 하나가 데이터베이스 커넥션을 전부 가져갈 수 있다.
 */
@Configuration
public class ChatQueryExecutorConfig {

	@Bean(name = "chatQueryExecutor", destroyMethod = "shutdown")
	public Executor chatQueryExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(4);
		executor.setMaxPoolSize(16);
		executor.setQueueCapacity(200);
		executor.setThreadNamePrefix("chat-query-");
		// 큐가 차면 부른 스레드가 직접 처리한다. 조회를 버리면 안읽음이 0으로 보인다.
		executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
		executor.initialize();
		return executor;
	}
}

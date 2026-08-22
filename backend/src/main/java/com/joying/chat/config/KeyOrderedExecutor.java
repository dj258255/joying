package com.joying.chat.config;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 같은 열쇠를 가진 일은 같은 스레드에서 순서대로 처리한다.
 *
 * <p>스레드 풀 하나에 던지면 같은 방, 같은 연결에서 온 일이 여러 스레드로 흩어져
 * 서로 앞지른다. 먼저 보낸 것이 뒤에 처리되고, 번호도 그 순서로 붙는다.
 *
 * <p>열쇠로 스레드를 골라 한 줄로 세운다. 같은 열쇠 안에서는 순서대로, 열쇠끼리는
 * 여전히 동시에 돈다. 한 방이 느려도 다른 방은 영향을 받지 않는다.
 *
 * <p>스레드마다 큐를 따로 두므로 한 열쇠에 몰리면 그 줄만 길어진다. 그것이 이
 * 방식의 값이다. 전부 한 줄로 세우면 순서는 완벽해지지만 하나가 전체를 막는다.
 *
 * <p>쓰는 곳은 둘이다. 들어오는 채널은 연결 단위로 묶어 한 사람이 연달아 보낸 것이
 * 서로 앞지르지 않게 하고, 메시지 처리는 방 단위로 묶어 그 방의 번호와 발행이 같은
 * 순서가 되게 한다.
 */
public class KeyOrderedExecutor {

	private static final Logger log = LoggerFactory.getLogger(KeyOrderedExecutor.class);

	private final List<ThreadPoolExecutor> partitions;

	public KeyOrderedExecutor(int partitionCount, String threadNamePrefix) {
		// 스레드 하나짜리 풀을 직접 만든다. Executors 의 편의 메서드는 감싼 것을
		// 돌려주어 큐 길이를 볼 수 없다. 줄이 얼마나 밀렸는지가 이 방식에서 가장
		// 중요한 지표라 직접 만든다.
		this.partitions = IntStream.range(0, partitionCount)
			.mapToObj(index -> new ThreadPoolExecutor(
				1, 1, 0L, TimeUnit.MILLISECONDS,
				new LinkedBlockingQueue<>(),
				namedThreadFactory(threadNamePrefix + index)))
			.toList();
	}

	/**
	 * 가장 많이 밀린 줄의 길이.
	 *
	 * <p>평균을 내면 한 방에 몰린 것이 묻힌다. 이 방식의 값은 한 줄이 길어지는 것이므로
	 * 가장 나쁜 줄을 본다.
	 */
	public int maxQueueDepth() {
		return partitions.stream().mapToInt(p -> p.getQueue().size()).max().orElse(0);
	}

	/** 모든 줄에 밀려 있는 일의 합 */
	public int totalQueueDepth() {
		return partitions.stream().mapToInt(p -> p.getQueue().size()).sum();
	}

	/**
	 * 이 열쇠의 일을 이 열쇠의 줄에 세운다.
	 *
	 * <p>{@code floorMod} 를 쓰는 이유는 열쇠가 음수일 수 있어서다. {@code %} 는
	 * 음수를 그대로 돌려주고 {@code Math.abs(Long.MIN_VALUE)} 는 다시 음수가 된다.
	 */
	public void execute(long partitionKey, Runnable task) {
		int index = (int) Math.floorMod(partitionKey, partitions.size());
		partitions.get(index).execute(task);
	}

	/** 문자열 열쇠. 연결 식별자처럼 숫자가 아닌 것을 쓸 때 */
	public void execute(String partitionKey, Runnable task) {
		execute(partitionKey == null ? 0L : partitionKey.hashCode(), task);
	}

	public int partitionCount() {
		return partitions.size();
	}

	/**
	 * 남은 일을 마칠 시간을 준 뒤 닫는다.
	 *
	 * <p>바로 끊으면 큐에 남은 메시지가 저장되지 않은 채 사라진다.
	 */
	public void shutdown() {
		partitions.forEach(ExecutorService::shutdown);
		for (ExecutorService partition : partitions) {
			try {
				if (!partition.awaitTermination(5, TimeUnit.SECONDS)) {
					log.warn("메시지 처리 스레드가 제때 끝나지 않아 남은 일을 버린다");
					partition.shutdownNow();
				}
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				partition.shutdownNow();
			}
		}
	}

	private static ThreadFactory namedThreadFactory(String name) {
		AtomicInteger counter = new AtomicInteger();
		return runnable -> {
			Thread thread = new Thread(runnable, name + "-" + counter.incrementAndGet());
			thread.setDaemon(false);
			return thread;
		};
	}
}

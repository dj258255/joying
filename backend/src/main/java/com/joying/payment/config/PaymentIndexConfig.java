package com.joying.payment.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 조건부 유니크 인덱스를 만든다.
 *
 * <p>살아 있는 결제는 대여 건과 종류마다 하나뿐이어야 한다. 이미 있는지를 조회해서
 * 판정하면 동시에 들어온 두 요청이 둘 다 없다고 읽고 둘 다 넣는다. 16건을 동시에
 * 보내면 결제가 10건 생겼다.
 *
 * <p>취소된 것은 제약에서 빼야 한다. 재시도할 때마다 취소 건이 쌓이는데 그것까지 묶으면
 * 두 번째 재시도가 막힌다.
 *
 * <p>JPA 의 {@code @UniqueConstraint} 로는 조건을 붙일 수 없다. 스키마를 {@code ddl-auto}
 * 가 만들고 있어 마이그레이션 도구도 꺼져 있으므로, 채팅 메시지 인덱스와 같은 방식으로
 * 기동할 때 만든다.
 *
 * <p>MySQL 을 쓰던 때는 이 기능이 없어 {@code active_key} 열을 두고 취소할 때 비우는
 * 방식으로 흉내 냈다. 유니크 인덱스가 빈 값을 서로 다른 것으로 본다는 성질에 기댄 것이다.
 * 열도 필요 없고 비울 것도 없어졌다.
 */
@Component
public class PaymentIndexConfig implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(PaymentIndexConfig.class);

	private static final String CREATE_ACTIVE_PAYMENT_INDEX = """
		CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_active
		ON payment (rental_his_id, payment_type)
		WHERE status <> 'CANCELED'
		""";

	private final JdbcTemplate jdbcTemplate;

	public PaymentIndexConfig(DataSource dataSource) {
		this.jdbcTemplate = new JdbcTemplate(dataSource);
	}

	@Override
	public void run(ApplicationArguments args) {
		try {
			jdbcTemplate.execute(CREATE_ACTIVE_PAYMENT_INDEX);
			log.info("결제 조건부 유니크 인덱스 확인 완료: uk_payment_active");
		} catch (Exception e) {
			// 이미 어긋난 데이터가 있으면 인덱스가 만들어지지 않는다. 그때는 사람이
			// 봐야 하므로 기동을 막지 않고 남긴다. 막으면 배포가 통째로 서는데,
			// 이 제약이 없어도 잠금이 앞에서 막고 있다.
			log.error("결제 조건부 유니크 인덱스를 만들지 못했다. "
					+ "같은 대여 건에 살아 있는 결제가 이미 둘 이상일 수 있다: {}", e.getMessage());
		}
	}
}

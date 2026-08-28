package com.joying.ssafy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.joying.common.config.ssafy.FinanceApiProperties;
import com.joying.wallet.port.TransferOutcome;

/**
 * 금융망 입금 결과 판정.
 *
 * <p>돈을 옮기는 호출은 성공과 실패 둘로 나눌 수 없다. 금융망이 확정해 준 것만 확정하고
 * 나머지는 미확정으로 남는지를 고정한다.
 */
@ExtendWith(MockitoExtension.class)
class FinanceApiServiceDepositTest {

	@Mock
	RestTemplate financeApiRestTemplate;

	@Mock(strictness = Mock.Strictness.LENIENT)
	FinanceApiProperties financeApiProperties;

	@InjectMocks
	FinanceApiService financeApiService;

	private static final String ACCOUNT_NO = "0015555555555555";
	private static final String USER_KEY = "user-key";

	private TransferOutcome deposit() {
		return financeApiService.depositMoney(ACCOUNT_NO, 10_000L, "테스트 입금", USER_KEY);
	}

	private void givenResponse(Object body) {
		given(financeApiProperties.getBaseUrl()).willReturn("https://finopenapi.example");
		given(financeApiRestTemplate.postForObject(anyString(), any(), any())).willReturn(body);
	}

	private void givenThrows(Throwable t) {
		given(financeApiProperties.getBaseUrl()).willReturn("https://finopenapi.example");
		given(financeApiRestTemplate.postForObject(anyString(), any(), any())).willThrow(t);
	}

	@Test
	@DisplayName("H0000과 거래고유번호가 오면 성공으로 확정한다")
	void succeeded() {
		givenResponse(Map.of(
			"Header", Map.of("responseCode", "H0000", "responseMessage", "정상처리"),
			"REC", Map.of("transactionUniqueNo", "TX-1")));

		TransferOutcome outcome = deposit();

		assertThat(outcome).isInstanceOf(TransferOutcome.Succeeded.class);
		assertThat(outcome.transferIdOrNull()).isEqualTo("TX-1");
	}

	@Test
	@DisplayName("REC이 리스트로 와도 거래고유번호를 꺼낸다")
	void succeededWithListRec() {
		givenResponse(Map.of(
			"Header", Map.of("responseCode", "H0000"),
			"REC", List.of(Map.of("transactionUniqueNo", "TX-2"))));

		assertThat(deposit().transferIdOrNull()).isEqualTo("TX-2");
	}

	@Test
	@DisplayName("H0000이 아닌 응답 코드는 확정 실패다. 돈은 옮겨지지 않았다")
	void rejectedByResponseCode() {
		givenResponse(Map.of(
			"Header", Map.of("responseCode", "A1001", "responseMessage", "잔액 부족")));

		TransferOutcome outcome = deposit();

		assertThat(outcome).isInstanceOf(TransferOutcome.Rejected.class);
		assertThat(((TransferOutcome.Rejected) outcome).reasonCode()).isEqualTo("A1001");
	}

	@Test
	@DisplayName("응답 코드가 아예 오지 않으면 거절이 아니라 미확정이다")
	void unconfirmedWhenResponseCodeMissing() {
		// Header 는 왔는데 코드가 없다. 무엇인지 모르는 코드가 아니라 코드를 못 읽은 것이다.
		// 예전에는 없는 값이 "null" 이라는 글자가 되어, H0000 이 아니라는 이유로
		// 거절 코드 "null" 을 달고 확정 실패가 됐다.
		givenResponse(Map.of(
			"Header", Map.of("responseMessage", "무언가 잘못됐다")));

		TransferOutcome outcome = deposit();

		assertThat(outcome)
			.as("옮겨졌는지 모르는 것을 옮겨지지 않았다고 적으면 안 된다")
			.isInstanceOf(TransferOutcome.Unconfirmed.class);
	}

	@Test
	@DisplayName("응답 코드가 빈 값이어도 미확정이다")
	void unconfirmedWhenResponseCodeBlank() {
		givenResponse(Map.of(
			"Header", Map.of("responseCode", "   ", "responseMessage", "")));

		assertThat(deposit()).isInstanceOf(TransferOutcome.Unconfirmed.class);
	}

	@Test
	@DisplayName("4xx는 금융망이 요청을 받고 거절한 것이므로 확정 실패다")
	void rejectedByHttpStatus() {
		givenThrows(HttpClientErrorException.create(
			HttpStatus.BAD_REQUEST, "Bad Request", null, null, null));

		assertThat(deposit()).isInstanceOf(TransferOutcome.Rejected.class);
	}

	@Test
	@DisplayName("읽기 타임아웃은 입금 여부를 알 수 없으므로 미확정이다")
	void unconfirmedOnReadTimeout() {
		givenThrows(new ResourceAccessException(
			"Read timed out", new SocketTimeoutException("Read timed out")));

		TransferOutcome outcome = deposit();

		assertThat(outcome).isInstanceOf(TransferOutcome.Unconfirmed.class);
		assertThat(outcome.isUnconfirmed()).isTrue();
	}

	@Test
	@DisplayName("응답이 비면 미확정이다")
	void unconfirmedOnNullBody() {
		givenResponse(null);

		assertThat(deposit()).isInstanceOf(TransferOutcome.Unconfirmed.class);
	}

	@Test
	@DisplayName("성공 코드가 와도 거래고유번호가 없으면 미확정이다. 나중에 다시 물을 열쇠가 없다")
	void unconfirmedWhenTransactionNumberMissing() {
		givenResponse(Map.of(
			"Header", Map.of("responseCode", "H0000"),
			"REC", Map.of()));

		assertThat(deposit()).isInstanceOf(TransferOutcome.Unconfirmed.class);
	}

	@Test
	@DisplayName("응답 모양을 알 수 없으면 성공으로 넘기지 않는다")
	void unconfirmedOnUnknownShape() {
		givenResponse("그냥 문자열");

		assertThat(deposit()).isInstanceOf(TransferOutcome.Unconfirmed.class);
	}

	@Test
	@DisplayName("타임아웃 기본값은 연결 2초, 읽기 5초다")
	void defaultTimeouts() {
		FinanceApiProperties actual = new FinanceApiProperties();

		assertThat(actual.getConnectTimeout()).isEqualTo(Duration.ofSeconds(2));
		assertThat(actual.getReadTimeout()).isEqualTo(Duration.ofSeconds(5));
	}
}

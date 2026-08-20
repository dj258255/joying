package com.joying.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.joying.chat.domain.PushSubscription;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

	List<PushSubscription> findByMemberId(Long memberId);

	Optional<PushSubscription> findByEndpoint(String endpoint);

	void deleteByEndpoint(String endpoint);

	void deleteByMemberId(Long memberId);
}

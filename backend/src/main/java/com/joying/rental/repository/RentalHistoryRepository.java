package com.joying.rental.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.joying.rental.domain.RentalHistory;

public interface RentalHistoryRepository extends JpaRepository<RentalHistory, Long> {
}
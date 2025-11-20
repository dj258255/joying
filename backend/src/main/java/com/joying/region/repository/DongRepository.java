package com.joying.region.repository;

import java.util.List;

import com.joying.region.domain.Dong;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DongRepository extends JpaRepository<Dong, Long> {
	List<Dong> findByGungu_GunguId(Long gugunId);
	List<Dong> findByGungu_GunguIdAndNameContaining(Long gugunId, String keyword);
}

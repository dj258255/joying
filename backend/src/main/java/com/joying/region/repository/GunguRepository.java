package com.joying.region.repository;

import java.util.List;

import com.joying.region.domain.Gungu;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GunguRepository extends JpaRepository<Gungu, Long> {
	List<Gungu> findBySido_SidoId(Long sidoId);
	List<Gungu> findBySido_SidoIdAndNameContaining(Long sidoId, String keyword);
}

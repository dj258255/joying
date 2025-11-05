package com.joying.region.repository;

import java.util.List;

import com.joying.region.domain.Sido;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SidoRepository extends JpaRepository<Sido, Long> {
	List<Sido> findByNameContaining(String keyword);
}

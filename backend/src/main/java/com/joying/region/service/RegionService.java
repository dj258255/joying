package com.joying.region.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.joying.region.domain.Dong;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Sido;
import com.joying.region.dto.RegionResponseDto;
import com.joying.region.repository.DongRepository;
import com.joying.region.repository.GunguRepository;
import com.joying.region.repository.SidoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegionService {

	private final SidoRepository sidoRepository;
	private final GunguRepository gugunRepository;
	private final DongRepository dongRepository;

	public List<RegionResponseDto> getSidos(String keyword) {
		List<Sido> sidos = (keyword == null || keyword.isBlank())
			? sidoRepository.findAll()
			: sidoRepository.findByNameContaining(keyword);

		return sidos.stream()
			.map(RegionResponseDto::fromEntity)
			.toList();
	}

	public List<RegionResponseDto> getGungus(Long sidoId, String keyword) {
		List<Gungu> gungus = (keyword == null || keyword.isBlank())
			? gugunRepository.findBySido_SidoId(sidoId)
			: gugunRepository.findBySido_SidoIdAndNameContaining(sidoId, keyword);

		return gungus.stream()
			.map(RegionResponseDto::fromEntity)
			.toList();
	}

	public List<RegionResponseDto> getDongs(Long gunguId, String keyword) {
		List<Dong> dongs = (keyword == null || keyword.isBlank())
			? dongRepository.findByGungu_GunguId(gunguId)
			: dongRepository.findByGungu_GunguIdAndNameContaining(gunguId, keyword);

		return dongs.stream()
			.map(RegionResponseDto::fromEntity)
			.toList();
	}
}
package com.joying.region.dto;

import com.joying.region.domain.Dong;
import com.joying.region.domain.Gungu;
import com.joying.region.domain.Sido;

import lombok.Builder;

@Builder
public record RegionResponseDto(Long id, String name) {
	public static RegionResponseDto fromEntity(Object entity) {
		if (entity instanceof Sido sido)
			return new RegionResponseDto(sido.getSidoId(), sido.getName());
		if (entity instanceof Gungu gugun)
			return new RegionResponseDto(gugun.getGunguId(), gugun.getName());
		if (entity instanceof Dong dong)
			return new RegionResponseDto(dong.getDongId(), dong.getName());
		throw new IllegalArgumentException("Unknown region type");
	}
}
package com.joying.common.config.mapper;

import org.mapstruct.InjectionStrategy;
import org.mapstruct.MapperConfig;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct 전역 설정
 *
 * 모든 Mapper에 공통으로 적용되는 설정
 * - componentModel = "spring": Spring Bean으로 자동 등록
 * - injectionStrategy = CONSTRUCTOR: 생성자 주입 사용
 * - unmappedTargetPolicy = ERROR: 매핑 누락 시 컴파일 에러
 * - nullValuePropertyMappingStrategy = IGNORE: null 값 무시
 */
@MapperConfig(
	componentModel = "spring",
	injectionStrategy = InjectionStrategy.CONSTRUCTOR,
	unmappedTargetPolicy = ReportingPolicy.ERROR,
	nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface MapStructConfig {
}
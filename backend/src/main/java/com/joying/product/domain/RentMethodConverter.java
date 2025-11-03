//package com.joying.product.domain;
//
//import jakarta.persistence.AttributeConverter;
//import jakarta.persistence.Converter;
//
//@Converter
//public class RentMethodConverter implements AttributeConverter<RentMethod, String> {
//
//    @Override
//    public String convertToDatabaseColumn(RentMethod attribute) {
//        return attribute == null ? null : attribute.name();
//    }
//
//    @Override
//    public RentMethod convertToEntityAttribute(String dbData) {
//        if (dbData == null || dbData.isBlank()) {
//            return null;
//        }
//        // 대소문자 무시하고 변환
//        return RentMethod.valueOf(dbData.toUpperCase());
//    }
//}

package com.joying.hashtag.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import com.joying.hashtag.domain.Hashtag;
import com.joying.hashtag.dto.HashtagResponseDto;
import com.joying.hashtag.repository.HashtagRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HashtagService {

	private final HashtagRepository hashtagRepository;

	public Page<HashtagResponseDto> getHashtags(int page, int size) {
		PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "hashtagId"));
		Page<Hashtag> hashtags = hashtagRepository.findAll(pageRequest);

		return hashtags.map(HashtagResponseDto::fromEntity);
	}

	public List<HashtagResponseDto> getHashtagsByCategoryId(Long categoryId) {
		List<Hashtag> hashtags = hashtagRepository.findByCategory_CategoryId(categoryId);

		return hashtags.stream().map(HashtagResponseDto::fromEntity).collect(Collectors.toList());
	}

	public void deleteHashtag(Long hashtagId) {
		hashtagRepository.deleteById(hashtagId);
	}
}

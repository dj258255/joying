package com.joying.hashtag.repository;

import com.joying.hashtag.domain.HashtagHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HashtagHistoryRepository extends JpaRepository<HashtagHistory,String> {
    List<HashtagHistory> findByProduct_ProductId(Long productId);
    void deleteByProduct_ProductId(Long productId);
}

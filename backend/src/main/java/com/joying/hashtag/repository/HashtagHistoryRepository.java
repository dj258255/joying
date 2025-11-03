package com.joying.hashtag.repository;

import com.joying.hashtag.domain.HashtagHistory;
import com.joying.hashtag.projection.HashtagCountProjection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HashtagHistoryRepository extends JpaRepository<HashtagHistory,String> {
    List<HashtagHistory> findByProduct_ProductId(Long productId);
    void deleteByProduct_ProductId(Long productId);

    @Query(value = """
SELECT h.hashtagId AS hashtagId,
       h.hashtagName AS hashtag,
       COUNT(DISTINCT hh.product) AS count
FROM HashtagHistory hh
JOIN hh.hashtag h ON hh.hashtag.hashtagId = h.hashtagId
WHERE hh.product.productId IN :productIds
GROUP BY h.hashtagId, h.hashtagName
ORDER BY count DESC
    """)
    List<HashtagCountProjection> findHashtagCountInProducts(List<Long> productIds);
}

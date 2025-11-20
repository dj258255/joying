package com.joying.file.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.joying.file.domain.ReviewFile;
import com.joying.review.domain.Review;

public interface ReviewFileRepository extends JpaRepository<ReviewFile, Long> {
	List<ReviewFile> findByReview(Review review);
}

package com.joying.category.repository;

import java.util.List;

import com.joying.category.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
	List<Category> findByCategoryLevel(Integer level);

	List<Category> findByParent_CategoryId(Long categoryId);
}

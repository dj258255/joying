package com.joying.product.service;

import com.joying.member.domain.Member;
import com.joying.member.repository.MemberRepository;
import com.joying.product.domain.Product;
import com.joying.product.repository.ProductLikeRepository;
import com.joying.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductLikeServiceImpl implements ProductLikeService {

    private final ProductRepository productRepository;
    private final MemberRepository memberRepository;
    private final ProductLikeRepository productLikeRepository;

    @Override
    public void like(Long memberId, Long productId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."));
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        boolean exists = productLikeRepository.existsByProduct_ProductIdAndMember_MemberId(productId, memberId);
        if (exists) return;

        try {
            productLikeRepository.save(
                    com.joying.product.domain.ProductLike.builder()
                            .product(product)
                            .member(member)
                            .build()
            );
        } catch (DataIntegrityViolationException e) {
        }
    }

    @Override
    public void unlike(Long memberId, Long productId) {
        productRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."));
        memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        productLikeRepository.deleteByProduct_ProductIdAndMember_MemberId(productId, memberId);
    }
}

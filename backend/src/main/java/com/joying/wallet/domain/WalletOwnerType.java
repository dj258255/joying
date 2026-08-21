package com.joying.wallet.domain;

/**
 * 지갑 주인.
 */
public enum WalletOwnerType {

	/** 회원 개인 지갑 */
	MEMBER,

	/** 거래 중인 돈을 중개가 들고 있는 지갑. 하나만 있다 */
	ESCROW
}

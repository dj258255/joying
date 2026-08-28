# 📦 ↔️ 📦 빌려조잉 - 물건을 서로 빌리고 빌려주는 C2C 공유 플랫폼

#### RTS(RenTalShop) (25.10.10 ~ 25.11.20)

---

## 📑 목차

- [프로젝트 개요](#overview)
  - [팀원 소개](#team)
  - [기획 배경](#background)
- [서비스 소개](#service)
  - [서비스 화면 및 기능](#screens)
- [개발 환경](#env)
- [프로젝트 구조](#structure)
- [프로젝트 산출물](#deliverables)
  - [API 명세서](#api)
  - [ERD](#erd)
  - [아키텍처](#architecture)
- [고치면서 남긴 기록](#log)

---

## 📌 프로젝트 개요 <a id="overview"></a>

### 1️⃣ 팀원 소개 <a id="team"></a>

| 범수 | 이유희 | 김소연 |
|:-:|:-:|:-:|
| ![](README_img/profile1.png) | ![](README_img/profile2.png) | ![](README_img/profile3.png) |
| Leader, Backend | Backend, Infra | Backend, Infra |
| 이승민 | 정용균 | 황성헌 |
| ![](README_img/profile4.png) | ![](README_img/profile5.png) | ![](README_img/profile6.png) |
| Frontend | Frontend | Backend, Elasticsearch |


### 2️⃣ 기획 배경 <a id="background"></a>

***일상에서 필요한 물건을 “잠깐” 쓰기 위해서는 여전히 많은 불편을 감수해야 합니다.***

>
* “한 번만 쓰면 되는데… 사기엔 너무 비싸요.”
* “당장 필요한데 빌릴 데가 없어요.”
* “중고 거래는 불안하고, 상태 확인도 어렵고….”
* “서로 믿고 거래하기엔 정보가 너무 적어요.”
...

카메라·렌즈·삼각대 같은 장비뿐 아니라,
일상에서 잠깐 필요한 물건들은 많지만
가격 부담, 지역 인프라 부족, 품질·상태에 대한 불신,
그리고 사기 위험 등으로 인해 대여 자체가 쉽지 않은 현실입니다.

특히 장비 대여 시장은
전문 장비는 비싸고 멀리 있고,
개인 간 거래는 불안하고 검증이 어렵고,
상태 확인 과정은 번거롭고 책임 소재도 불명확합니다.

이런 구조적인 불편을 해결하기 위해
우리는 “누구나, 가까운 사람에게, 믿을 수 있는 방식으로”
물건을 빌리고 빌려줄 수 있는 환경이 필요하다고 생각했습니다.

---

## 🖥️ 서비스 소개 <a id="service"></a>

***"필요한 순간에, 필요한 물건을, 믿고 빌릴 수 있도록."***

저희의 플랫폼은
사용자 간 안전하고 편리한 C2C 물품 대여를 가능하게 하는 서비스입니다.

실시간 채팅, 보증금 에스크로,

리뷰 기반 신뢰도 시스템, 검색 및 다양한 필터링, 

예약·반납 관리, AI 기반 등록 작성 도움 등

다양한 기능을 통해
기존 개인 간 거래의 불안 요소를 최소화하고
물건의 상태, 사용자 신뢰도, 거래 과정의 투명성을 극대화합니다.

또한
카메라·렌즈·삼각대 같은 장비는
대여 후 실제 촬영 결과물 리뷰를 제공하여
단순한 “대여 서비스”를 넘어
“경험 기반 정보 플랫폼”으로 확장됩니다.

누구든, 필요할 때, 부담 없이, 안전하게.
우리는 사람들이 가진 물건이 더 많이 순환하고
사용자의 선택이 더 똑똑해지는 환경을 만들고자 합니다.

###  서비스 화면 및 기능 <a id="screens"></a>

#### 1) 메인 페이지 & 검색

|                  메인 페이지 & 검색                  |
|:-----------------------------------------------:|
| ![메인 페이지 & 검색](/README_img/mainAndSearch.gif) ![](/README_img/mainAndSearchWeb.gif)|

* 메인 페이지는 Three.js를 활용한 시각적 UI로 서비스 분위기를 직관적으로 전달합니다.
* 상단 검색 창에서 원하는 상품이나 카테고리를 빠르게 탐색할 수 있습니다.
* 상품 리스트 페이지로 이동하여 전체 상품 또는 검색 결과를 확인할 수 있으며, 다양한 필터링(날짜, 해시태그, 가격, 평점, 지역, 당일 대여 여부)을 통해 원하는 조건의 상품만 조회할 수 있습니다.

***

#### 2) 상품 등록 & 상품 상세
|                     상품 등록 & 상품 상세                    |
|:----------------------------------------------------:|
| ![상품 등록 & 상품 상세](/README_img/productUploadAndDetail.gif) |

* 이미지 분석 기반 AI 기능으로 상품 이미지 업로드 시 자동으로 제목, 내용, 가격, 해시태그 등을 추천/입력합니다.
* 사용자는 최소한의 입력만으로 상품을 등록할 수 있으며, AI의 제안은 수동으로 편집 가능합니다.
* 등록된 상품의 상세 정보와 리뷰를 확인할 수 있습니다.
* 상품 정보, 가격, 해시태그, 판매자 정보뿐 아니라 이전 리뷰와 평점을 한눈에 볼 수 있습니다.

***

#### 3) 인물 상세

|                     인물 상세                     |
|:----------------------------------------------------:|
| ![인물 상세](/README_img/memberDetail.gif) |

* 해당 사용자가 등록한 상품 목록과 작성한 리뷰를 확인할 수 있습니다.
* 판매자 및 구매자 프로필을 기반으로 신뢰성을 평가하고, 다른 상품 탐색 및 거래 의사 결정을 돕습니다.

#### 4) 마이페이지 & 대여 상세

|                           마이페이지 & 대여 상세                            |
|:-------------------------------------------------------------:|
| ![마이페이지 & 대여 상세](/README_img/mypage.gif) |

* 내가 등록한 상품, 작성한 리뷰, 받은 리뷰, 대여 내역 등을 한눈에 확인할 수 있습니다.
* 각 항목별로 편집, 삭제, 상태 확인 등 관리를 수행할 수 있습니다.
* 대여 상태, 대여 기간, 관련 리뷰를 확인할 수 있습니다.

***

#### 6) 채팅 기반 거래
|                                          채팅 기반 거래                                          |
|:---------------------------------------------------------------------------------------:|
|                             ![채팅 기반 거래](/README_img/chating.gif) ![](/README_img/chatingOp.gif)                             |

* 채팅을 통해 상품 거래를 실시간으로 진행할 수 있습니다.
* 채팅 화면에서 거래 생성 및 확인, 가상 송금(실제 결제는 아님), 영상 전송까지 가능합니다.
* 거래 종료 후에는 리뷰 작성 기능을 통해 판매자와 구매자 모두 피드백을 남길 수 있습니다.

---

## 🛠️ 개발 환경 <a id="env"></a>

| **BackEnd** | ![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk&logoColor=white) ![SpringBoot](https://img.shields.io/badge/SpringBoot-3.5.6-6DB33F?logo=springboot&logoColor=white) ![SpringSecurity](https://img.shields.io/badge/Security-SpringSecurity-6DB33F?logo=springsecurity&logoColor=white) ![JPA](https://img.shields.io/badge/JPA-Hibernate-59666C?logo=hibernate&logoColor=white) ![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens) ![REST API](https://img.shields.io/badge/API-REST-blueviolet) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white) ![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.x-005571?logo=elasticsearch&logoColor=white) ![JPA](https://img.shields.io/badge/Persistence-JPA-red) ![Gradle](https://img.shields.io/badge/Build-Gradle-02303A) |
|:-|:-|
| **FrontEnd** | ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white) ![React Router](https://img.shields.io/badge/ReactRouter-CA4245?logo=reactrouter&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white) ![Context API](https://img.shields.io/badge/State_Context-FFCA28) 
| **AI Server** | ![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?logo=fastapi) ![Uvicorn](https://img.shields.io/badge/Uvicorn-0.32.0-FFCA28?logo=uvicorn) ![LangChain](https://img.shields.io/badge/LangChain-0.3.7-1B6EEA) ![LangChain OpenAI](https://img.shields.io/badge/LangChain--OpenAI-0.2.8-412991) ![Pydantic](https://img.shields.io/badge/Pydantic-2.10.2-E92063) ![httpx](https://img.shields.io/badge/httpx-0.27.2-007EC6)
| **Infra** | ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white) ![EC2](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white) ![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare_R2-F38020?logo=cloudflare&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-7.2-DC382D?logo=redis) ![Let's Encrypt](https://img.shields.io/badge/SSL-Let's_Encrypt-003A70?logo=letsencrypt&logoColor=white)
| **Test** | ![JUnit5](https://img.shields.io/badge/JUnit5-25A162?logo=junit5&logoColor=white) ![Mockito](https://img.shields.io/badge/Mockito-4B8BBE?logo=mockito&logoColor=white) ![k6](https://img.shields.io/badge/k6-7D64FF?logo=k6&logoColor=white)

---


## 🗂️ 프로젝트 구조 <a id="structure"></a>

#### 🗂️  Back

```plaintext
├──📁account        # 은행 계좌 연동, 출금·입금 계좌 관리
├──📁auth           # OAuth2 / 1원 인증 / 로그인·토큰 인증 처리
├──📁category       # 상품 카테고리 도메인
├──📁common         # 공통 Entity, Exception, Response, Config, Util 모듈
├──📁escrow         # 보증금 에스크로 처리(예치/정산 로직)
├──📁file           # 파일 업로드(이미지/동영상) 처리
├──📁hashtag        # 상품 해시태그 관련 기능
├──📁member         # 회원 CRUD, 프로필, 권한, 지역 정보
├──📁outbox         # Outbox 패턴(이벤트 발행/메시지 저장)
├──📁payment        # 결제, TossPayment 연동 처리
├──📁product        # 상품 CRUD, 상태, 위치 정보, 찜하기 등
├──📁region         # 지역(시·구·동) 정보 관리
├──📁rental         # 대여/예약/반납 로직 및 기간 계산
├──📁review         # 리뷰(인물·제품) CRUD 및 평점 계산
├──📁search         # 검색, 필터링 기능
└──📁ssafy          # 싸피 금융망
```

* BackEnd는 **도메인 중심 설계(Domain-Driven Design, DDD)** 를 기반으로 기능별 패키지로 구분되어 있습니다.<br/>
* 각 기능은 controller → service → repository → domain의 계층 구조를 따르며, 요청·응답 DTO, 예외 처리, 외부 연동 모듈 등을 포함합니다.<br/>
* 이를 통해 유지보수성 향상, 확장성 보장, 가독성 및 역할 명확화, 테스트 용이성, 비즈니스 로직 집중 등 다양한 장점을 확보하였습니다.<br/>

#### 🗂️ Front

```plaintext
├──📁assets              # 정적 자원(이미지, 아이콘, 이모티콘 등)
│   └──📁icons           # UI에서 사용하는 아이콘 모음
│   └──📁imoticon        # 채팅용 이모티콘 이미지
├──📁features            # 페이지/기능별 컴포넌트 디렉토리
│   └──📁auth            # 로그인, 회원가입 등 인증 관련 기능
│   └──📁category        # 카테고리 관련 UI 및 로직
│   └──📁chat            # 채팅 기능 관련 컴포넌트
│   └──📁checkout        # 체크아웃/주문 페이지
│   └──📁home            # 홈 페이지
│   └──📁mypage          # 마이페이지 관련 기능
│   └──📁payment         # 결제 관련 UI/로직
│   └──📁product         # 상품 목록/상세/등록
│   └──📁push            # 푸시 알림 관련
│   └──📁region          # 지역 선택 관련 기능
│   └──📁rental          # 대여 관련 기능
│   └──📁review          # 리뷰 작성/조회 기능
│   └──📁search          # 검색 기능
│   └──📁seller          # 판매자 관련 페이지
│   └──📁shipping        # 배송 관련 기능
│   └──📁user            # 사용자 프로필 관리
│   └──📁video           # 비디오 재생/업로드 기능
├──📁lib                 # 공용 라이브러리 및 API/상태 관리
│   ├──📁axios            # Axios 인스턴스 설정 및 인터셉터 관리
│   │   └──axiosInstance.js  # 쿠키 기반 인증, 토큰 갱신 로직 포함
│   ├──📁react-query      # React Query 설정 및 쿼리 키 관리
│   │   ├──queryClient.js  # 쿼리 캐시/재시도/상태 옵션 설정
│   │   └──queryKeys.js     # 쿼리 키 상수 정의
│   ├──📁zustand           # 글로벌 상태 관리 모듈 (필요 시)
├──📁mocks                # Mock Service Worker 기반 API 모킹
│   ├──browser.js          # 브라우저 환경 MSW 워커 설정
│   └──handlers.js         # 주요 API 엔드포인트 시뮬레이션
├──📁polyfills             # 브라우저 환경 Node.js 전역 객체 폴리필
│   └──nodeGlobals.js      # global, process, Buffer 폴리필 적용
├──📁shared               # 공용 컴포넌트/유틸/로고/레이아웃
│   └──📁api
│   └──📁components
│   └──📁constants
│   └──📁contexts
│   └──📁hooks
│   └──📁layouts
│   └──📁utils
└──📁style                # 공용 CSS/SCSS 스타일

```

* Frontend는 기능별 디렉토리 분리를 통해 페이지별 컴포넌트 관리가 용이하며, 공용 UI와 페이지 전용 UI를 분리하여 재사용성을 확보했습니다.<br/>
* Axios 인스턴스와 React Query 클라이언트를 모듈화하여 API 호출과 상태 관리 로직을 일관되게 유지했습니다. 쿠키 기반 인증, 토큰 갱신, 오류 처리까지 통합하여 안정적인 API 통신을 지원합니다.<br/>
* Polyfills를 활용해 브라우저 환경에서도 Node.js 라이브러리 호환성을 확보했으며, Mocks 디렉토리를 통해 백엔드 없이도 프론트엔드 기능 검증과 UI 테스트가 가능합니다.<br/>
* 이러한 구조 덕분에 코드 유지보수성과 확장성이 높고, 테스트 효율성과 개발 생산성을 극대화할 수 있습니다.<br/>

#### 🗂️  AI

```plaintext
├── 📁 advanced_chain.py     # LangChain 기반 RAG·LLM 체인 로직 (고급 프롬프트, 후처리 포함)
├── 📁 category_matcher.py   # 사용자 입력 → 카테고리 추천/매핑 모델 (Embedding / LLM 분류 등)
├── 📁 config.py             # 환경 변수, API Key, 모델 설정 등 글로벌 설정 관리
├── 📁 main.py               # FastAPI 엔트리포인트 / 라우터 / 헬스체크 / 서비스 초기화
└── 📁 schemas.py            # 요청·응답 모델(Pydantic) 정의 — DTO 역할
```

* AI 서버는 기능별 모듈 분리 구조로 설계되어 유지보수성과 확장성을 높였습니다.<br>
* LangChain 기반 로직, 카테고리 매칭 모델, API 진입점 등을 독립 파일로 구성해 역할이 명확하게 분리됩니다.<br>
* 환경 변수, 모델 키, 공통 설정은 config.py에서 중앙 관리하여 환경별 설정 변경을 간소화했습니다.<br>
* FastAPI 라우팅 구조를 그대로 반영하여 프론트엔드–백엔드–AI 서버 전체의 API 명세 일관성을 유지합니다.<br>
* 요청/응답 스키마는 schemas.py에 통합해 데이터 검증을 강화하고, Swagger 문서화도 자동으로 지원합니다.<br>
* 로직이 복잡한 LLM 처리(advanced_chain.py)와 카테고리 분류(category_matcher.py)를 별도 모듈로 분리하여 고급 기능 추가에 유연한 구조를 확보했습니다.<br>
---

## 🧾 프로젝트 산출물 <a id="deliverables"></a>

### 1️⃣ API 명세서 <a id="api"></a>

| [🔗 API 명세서 바로가기](https://www.notion.so/SSAFY-2880b21b238380dc8147d75abc6c0e66?source=copy_link) |

***

### 2️⃣ ERD <a id="erd"></a>

| ![](/README_img/erd.png) |
|:-----------------:|

***

### 3️⃣ 아키텍처 <a id="architecture"></a>

| ![](/README_img/architecture.png) |

|:-----------------:|

---

## 🔧 고치면서 남긴 기록 <a id="log"></a>

서비스를 만든 뒤, **무엇이 잘못돼 있었고 무엇을 보고 알았는지**를 상황별로 남겼다.
수치는 잰 조건과 함께 적고, 재지 않은 것은 재지 않았다고 적는다.

### 👉 [전체 기록 보기](docs/README.md)

몇 가지만 꼽으면,

| 무엇이 잘못돼 있었나 | 무엇을 보고 알았나 | 결과 |
|---|---|---|
| 같은 방의 두 사람이 다른 서버에 붙어 메시지 순서가 뒤집혔다 | 1:1 실제 지형으로 두 노드에서 400건을 주고받으며 셌다 | 42~54회 → **0회** |
| 결제 버튼을 두 번 누르면 결제가 여러 건 생겼다 | 16건을 동시에 밀어 넣었다 | 10건 → **1건** |
| 저장소가 300ms 느려지자 왕복이 64초가 됐다 | Toxiproxy 로 지연과 단절을 주입했다 | 막힌 자리가 예상과 달랐다 |
| 답장이 섞인 목록 조회가 여섯 배 느렸다 | 답장 비율을 바꿔 가며 쟀다 | 60ms → **10ms** |
| 토스에 묻는 동안 DB 커넥션을 쥐고 있었다 | 호출 순간의 커넥션 수를 쟀다 | 상관없는 조회 대기 2,021ms → **2ms** |
| Elasticsearch 가 메모리를 4.19GiB 쓰고 있었다 | 컨테이너별 사용량을 봤다 | 4.19GiB → **905MiB** |

### 되풀이된 것

- **재는 자리를 다섯 번 틀렸다.** 재는 쪽이 운영과 다르면 나오는 값은 운영의 값이 아니다.
  부하 스크립트가 방 번호를 안 보내서 0이 안 나온 적도, 하네스가 쿠키 규칙을 빼먹어
  "문제 없음"이 나온 적도 있다.
- **도구를 붙일 때마다 뭔가 나왔다.** CI 를 붙이자 `gradlew` 실행 권한이, 설정을 옮기자
  깨진 주석이, 정적 분석을 붙이자 널 역참조가, 배포를 처음 돌리자 여섯 군데가 나왔다.
  **넷 다 새로 생긴 것이 아니라 원래 있었는데 아무도 안 보던 것이다.**

### 못 한 것도 적었다

[아직 하지 않은 것](docs/refactoring/README.md#아직-하지-않은-것) 에 **왜** 못 하는지와
함께 남겼다. 계약이 필요한 것, 실 API 가 사라져 확인할 수 없는 것, 실 트래픽이 없어
기준을 정할 수 없는 것을 구분해 두었다.

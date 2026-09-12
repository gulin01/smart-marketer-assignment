# 001 — 작업

- 스펙: `./spec.md` · 계획: `./plan.md`

구현 순서: contracts → mock-data → schema/repo → controller ∥ api-client → web

## contracts
- [x] T001 · 환경변수 스키마 (`lib/env.ts`) — 잘못된 설정은 부팅이 아니라 **빌드**에서 실패
- [x] T002 · API 오류 형태 통일 `{error:{code,message,details?}}` (`lib/http.ts`)
- [x] T003 · 채널 enum 과 링크 생성 규칙 (`lib/channels.ts`)
- [x] T004 · 템플릿 파싱 계약 — `<form>` 1개 + 이름 있는 필드 (`lib/template.ts`)

## mock-data
- [x] T005 · 운영자 시드 (`prisma/seed.ts`)
- [x] T006 · docker-compose Postgres + 테스트 DB 초기화

## schema/repo
- [x] T007 · Prisma 스키마 7개 모델 + `Channel` enum
- [x] T008 · 초기 마이그레이션
- [x] T009 · Prisma 클라이언트 싱글턴 + pg 어댑터 (`lib/db.ts`)
- [x] T010 · 집계 쿼리 — 방문/제출을 **별도 CTE** 로 (`lib/stats.ts`)

## controller
- [x] T011 · 세션 발급/검증, `requireSession()` · `withOperator()`
- [x] T012 · `proxy.ts` — 라우트 가드 + `visitor_id` 발급
- [x] T013 · 인증 라우트 3종
- [x] T014 · 템플릿 등록·조회·미리보기
- [x] T015 · 캠페인·폼 CRUD, 링크 4개 자동 생성
- [x] T016 · 공개 폼 렌더 — 히든 필드·제출 스크립트 주입 + CSP
- [x] T017 · 공개 제출 — 필드 화이트리스트, 레이트 리밋, Origin 검증
- [x] T018 · 성과 조회 + 날짜 필터
- [x] T019 · 제출 목록 · CSV (BOM, 수식 주입 방어)

## web
- [x] T020 · 로그인
- [x] T021 · 대시보드 — KPI + 캠페인 표
- [x] T022 · 캠페인 목록·상세 (채널 표 + 막대)
- [x] T023 · 템플릿 목록·업로드·미리보기
- [x] T024 · 폼 상세 — 링크 복사
- [x] T025 · 제출 내역 · CSV 버튼
- [x] T026 · 공개 폼 셸 + 404

## 검증
- [x] T027 · 단위 — 전환율 0 나누기·반올림, 템플릿 파싱, 채널 파싱, 레이트 리밋
- [x] T028 · API 성공 경로 — 로그인→업로드→캠페인→폼→링크 4개
- [x] T029 · API 실패 경로 — 401 · 400 · 404 · 409 · 410 · 429 · 403
- [x] T030 · 집계 정확성 — 방문자 중복 제거, 채널 귀속, 행 곱 방지
- [x] T031 · **보안** — 악성 템플릿이 관리 API 호출 시 401, 응답 본문 무유출
- [x] T032 · E2E — 실제 브라우저에서 전체 여정 + 쿠키 격리 증명
- [x] T033 · DONE 게이트

## 범위에서 제외한 것

- **recharts** — 채널 4개짜리 막대에 클라이언트 차트 라이브러리를 더할 이유가 없어
  div 로 그렸다 (ADR 0008)
- **제출 목록 페이지네이션** — 최근 500건 표시 + 전체 CSV 로 대체
- **인메모리 레이트 리밋의 분산 처리** — 단일 프로세스 전제. 한계를 ADR 0008 에 기록

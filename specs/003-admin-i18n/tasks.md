# 003 — 작업

- 스펙: `./spec.md`

소형 피쳐이므로 `plan.md` 없이 spec → tasks 로 진행했다. 데이터 모델 변경이 없고
API 계약이 하나(`POST /api/locale`)뿐이라, 계획 문서가 스펙을 되풀이하게 된다.

## contracts
- [x] T001 · `dictionaries.ts` — 한국어 원본, 영어는 파생 타입
- [x] T002 · `getLocale()` · `getTranslations()` · `interpolate()`
- [x] T003 · `apiMessage()` — 요청 컨텍스트 밖에서는 기본 로케일로 폴백

## controller
- [x] T004 · `POST /api/locale` — 쿠키 설정 (1년, lax)
- [x] T005 · `proxy.ts` 공개 경로에 `/api/locale` 추가
- [x] T006 · 전 라우트의 사용자 노출 메시지를 사전 경유로 전환

## web
- [x] T007 · 헤더 언어 전환 버튼 + `router.refresh()`
- [x] T008 · 관리 셸·대시보드·캠페인·템플릿·폼·제출·로그인 문구 치환
- [x] T009 · 클라이언트 컴포넌트는 서버에서 사전 조각을 props 로 받는다

## 검증
- [x] T010 · 단위 — 두 로케일의 키 집합 일치
- [x] T011 · 단위 — 두 로케일의 placeholder 집합 일치
- [x] T012 · 단위 — 빈 문자열 없음, `interpolate` 미지정 토큰은 남긴다
- [x] T013 · E2E — 전환이 실제로 UI 를 바꾸고 이동 후에도 유지
- [x] T014 · DONE 게이트

## 범위에서 제외한 것

- 공개 폼 번역 — 스펙의 결정대로 한국어 고정
- 날짜·숫자 로케일 포맷 — 현재 `ko-KR` 고정. 영어 사용자에게도 읽히며, 바꾸려면
  별도 스펙으로 다룬다

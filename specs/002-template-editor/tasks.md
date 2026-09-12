# 002 — 작업

- 스펙: `./spec.md` · 계획: `./plan.md`

## contracts
- [x] T001 · `TemplateValidationError` 가 번역 가능한 **키**를 들도록 변경
- [x] T002 · `diffFields(prev, next)` — 업로드와 편집이 같은 함수를 쓴다

## schema/repo
- [x] T003 · `TemplateVersion` 모델 + `HtmlTemplate.updatedAt`
- [x] T004 · 마이그레이션 — `updatedAt` 기본값으로 기존 행 백필
- [x] T005 · 로컬 · 테스트 · **운영(Neon)** 에 적용

## controller
- [x] T006 · `GET /api/templates/:id` — 사용 현황·버전 수 포함
- [x] T007 · `PUT /api/templates/:id` — 서버 재파싱, 트랜잭션으로 스냅샷 + 갱신
- [x] T008 · 필드 삭제 감지 → 409 + 영향 건수
- [x] T009 · `GET .../versions` — html 제외
- [x] T010 · `POST .../restore` — 덮어쓰는 내용도 스냅샷

## web
- [x] T011 · CodeMirror 6 래퍼 (`components/code-editor.tsx`)
- [x] T012 · 분할 편집 페이지 + 400ms 디바운스 미리보기
- [x] T013 · 감지 필드 칩 · 사용 현황 · 저장/취소
- [x] T014 · 필드 삭제 확인 UI
- [x] T015 · 변경 이력 패널 + 복원
- [x] T016 · 저장 안 한 변경 이탈 경고
- [x] T017 · 템플릿 목록에 **편집** 버튼

## 검증
- [x] T018 · 단위 — `diffFields` 추가/삭제/유지
- [x] T019 · API 성공 — 제자리 저장, 스냅샷 생성, 이름 갱신
- [x] T020 · API 실패 — form 없음/2개, 401, 404
- [x] T021 · API — 필드 삭제 시 409 및 확인 후 진행, 기존 응답 보존 확인
- [x] T022 · API — 이력 목록(html 미포함), 복원 및 복원의 복원 가능성
- [x] T023 · **E2E** — 운영 중인 폼의 템플릿을 편집 → 공개 폼에 즉시 반영 → 복원
- [x] T024 · DONE 게이트

## 범위에서 제외한 것

- 초안(draft) 저장 — 자동 저장을 하지 않기로 한 결정과 같은 이유
- 버전 간 diff 뷰 — 이력 목록 + 복원으로 충분하다고 판단. 필요해지면 별도 스펙

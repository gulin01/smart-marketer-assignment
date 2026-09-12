# 002 — 계획

- 스펙: `./spec.md`

## 접근

템플릿 행을 **제자리에서** 갱신한다. id 가 유지되므로 참조하는 폼은 아무 변경 없이
새 내용을 서빙한다 — 재연결 문제가 사라지는 지점이 바로 여기다.

되돌릴 수 있게 하려고 저장 직전 내용을 스냅샷으로 남긴다. 복원도 같은 규칙을 따라
덮어쓰는 내용을 먼저 스냅샷으로 남기므로, 복원 자체를 되돌릴 수 있다.

## 데이터 모델

| 변경 | 내용 | 되돌리기 |
|---|---|---|
| 신규 테이블 | `TemplateVersion { id, templateId, html, fieldNames, note, createdAt, createdById }` | 테이블 삭제 |
| 컬럼 추가 | `HtmlTemplate.updatedAt` — `@default(now()) @updatedAt` | 컬럼 삭제 |

**덧붙이는 변경만.** 기본값 없이 `updatedAt` 을 추가하면 기존 행이 있는 테이블에서
마이그레이션이 거부되므로 `@default(now())` 로 백필한다.

헌법 VII 의 "파괴적 마이그레이션" 에 해당하지 않는다.

## API 계약

| 메서드 | 경로 | 요청 | 성공 | 오류 |
|---|---|---|---|---|
| GET | `/api/templates/:id` | — | 200 `{...template, versionCount, usage}` | 401 · 404 |
| PUT | `/api/templates/:id` | `{html, name?, confirmFieldRemoval?}` | 200 `{template, diff}` | 400 · 401 · 404 · **409** |
| GET | `/api/templates/:id/versions` | — | 200 `{versions}` (html 제외) | 401 · 404 |
| POST | `/api/templates/:id/versions/:versionId/restore` | — | 200 `{template, diff}` | 401 · 404 |

409 본문에는 `{removedFields, affectedSubmissions, requiresConfirmation}` 을 담아
클라이언트가 확인 UI 를 그릴 수 있게 한다.

목록 응답에서 `html` 은 제외한다 — 본문이 200 KB 까지 가능하고 목록은 메타데이터만
필요하다.

## 헌법 점검

| 원칙 | 충돌 | 근거 |
|---|---|---|
| I 스펙 우선 | 없음 | 이 스펙이 먼저 작성됨 |
| IV 테스트 | 없음 | 성공·실패 경로 + 필드 삭제 확인 흐름 + 복원 |
| V 추측 금지 | 없음 | 사양서의 열린 질문 3개를 결정으로 확정 후 착수 |
| VII 비가역 | 해당 없음 | 덧붙이는 마이그레이션 |

## 되돌리기

`TemplateVersion` 이 있으므로 잘못된 편집은 UI 에서 복원. 기능 자체를 되돌리려면
테이블·컬럼 삭제 후 이전 배포로 롤백.

## 검토한 대안

| 대안 | 기각 이유 |
|---|---|
| 새 템플릿 행 생성 | 기존 문제 그대로 — 폼 재연결이 남는다 |
| 버전 없이 덮어쓰기 | 공개 중인 폼을 망가뜨렸을 때 되돌릴 방법이 없다 |
| Monaco | HTML 한 파일에 수 MB 번들 |
| 디바운스 없이 매 타건 렌더 | iframe 스크롤 초기화, 템플릿 스크립트 재실행 |
| 필드 삭제를 무조건 차단 | 정당한 스키마 변경까지 막는다 |

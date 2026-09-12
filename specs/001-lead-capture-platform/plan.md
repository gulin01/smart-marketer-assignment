# 001 — 계획

- 스펙: `./spec.md`

## 접근

관리 UI 와 API 를 한 저장소(Next.js App Router)에 두고, 공개 폼만 별도 오리진에서
서빙한다. 프런트/백엔드를 나누면 CORS·배포·타입 공유가 각각 별도 작업이 되는데,
3일 예산에서 그 비용은 기능 하나에 해당한다 (ADR 0001).

격리는 한 겹이 아니라 네 겹으로 건다. 어느 한 겹이 잘못 설정돼도 나머지가 남는다.

## 데이터 모델

| 변경 | 내용 | 되돌리기 |
|---|---|---|
| 신규 | `Operator` — 시드된 운영자 1명 | 테이블 삭제 |
| 신규 | `HtmlTemplate` — 원본 html + 파싱된 fieldNames | 테이블 삭제 |
| 신규 | `Campaign`, `Form` | 테이블 삭제 |
| 신규 | `DistributionLink` — `@@unique([formId, channel])` | 테이블 삭제 |
| 신규 | `Visit` — formId, channel, visitorId, UA | 테이블 삭제 |
| 신규 | `Submission` — jsonb `data` + name/phone/email 컬럼 | 테이블 삭제 |
| 신규 | `enum Channel` | — |

전부 신규 테이블. 파괴적 변경 없음.

## API 계약

| 메서드 | 경로 | 요청 | 성공 | 오류 |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | 200 + 세션 쿠키 | 400 · 401 |
| POST | `/api/auth/logout` | — | 200 | — |
| GET | `/api/auth/me` | — | 200 | 401 |
| GET/POST | `/api/templates` | 멀티파트 또는 `{name, html}` | 200 / 201 | 400 · 401 |
| GET/POST | `/api/campaigns` | `{name, description?}` | 200 / 201 | 400 · 401 |
| GET/POST | `/api/forms` | `{campaignId, templateId, title, slug?}` | 200 / 201 | 400 · 401 · 404 · 409 |
| GET/POST | `/api/forms/:id/links` | — | 200 | 401 · 404 |
| GET | `/api/forms/:id/submissions` | `?format=csv&from=&to=` | 200 | 400 · 401 · 404 |
| GET | `/f/:slug` | `?ch=` | 200 HTML | 404 |
| GET | `/f/:slug/render` | `?ch=` | 200 HTML + CSP | 404 · 410 |
| POST | `/api/public/forms/:slug/submissions` | `{channel?, visitorId?, data}` | 201 | 400 · 403 · 404 · 410 · 429 |
| GET | `/api/stats/campaigns` | `?from=&to=` | 200 | 400 · 401 |
| GET | `/api/stats/campaigns/:id/channels` | `?from=&to=` | 200 | 400 · 401 · 404 |

## 헌법 점검

| 원칙 | 충돌 | 근거 |
|---|---|---|
| I 스펙 우선 | **있음** | 이 스펙은 구현 후 정리됐다. `specs/README.md` 에 명시 |
| III 검증 | 없음 | DONE 게이트 전부 통과 |
| IV 테스트 | 없음 | 실패 경로 11종을 개별 테스트로 고정 |
| V 추측 금지 | 없음 | 과제 안내에 없는 지점은 가정으로 명시하고 ADR 로 기록 |
| VII 비가역 | 해당 | 운영 배포·마이그레이션은 사람 승인 후 실행 |

## 되돌리기

전부 신규 테이블이므로 마이그레이션 되돌리기는 테이블 삭제. 배포는 Vercel 이전
배포로 롤백.

## 검토한 대안

| 대안 | 기각 이유 |
|---|---|
| Express + React 분리 | 배포 대상 2개, 타입 공유에 별도 패키지 필요 |
| DOMPurify 로 HTML 정화 | 운영자의 정상 스크립트를 망가뜨린다. 우회 사례가 계속 보고된다 |
| iframe 없이 직접 삽입 | 같은 문서에서 실행되므로 방어 수단이 사실상 없다 |
| 방문·제출을 단일 JOIN 으로 집계 | 행이 곱해져 양쪽 수치가 부풀려진다 — 실제로 발생 |
| SQLite | `COUNT(DISTINCT)` 와 jsonb 에서 Postgres 가 명확히 낫다 |

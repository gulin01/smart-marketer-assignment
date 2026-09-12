# CLAUDE.md

이 저장소에서 일하는 방식. 세션마다 읽힌다.

**헌법**: `.specify/memory/constitution.md` — 이 문서보다 우선한다.
**게이트**: `.specify/memory/gates.md`

---

## 원칙 1 — 추측하지 않는다

사양서에 없거나 해석이 갈리면 **멈추고 사람에게 묻는다.** 추측해서 구현한 뒤
"확인이 필요합니다" 를 덧붙이는 것은 묻는 것이 아니다.

기본값을 골랐다면 그것이 기본값이라는 사실과 근거를 말한다.

## 원칙 2 — 스펙 → 계획 → 작업 → 구현

코드를 쓰기 전에 `specs/NNN-*/` 가 있어야 한다.

```
/speckit-specify   Jira 티켓 + Drive 사양서 → spec.md
/speckit-clarify   모호점 최대 5개 질문 → spec.md 의 결정 표
/speckit-plan      → plan.md
/speckit-tasks     → tasks.md
/speckit-implement → 코드 + DONE 게이트 + PR
/speckit-status    전체 진행 현황
```

소형 피쳐는 spec → tasks 만으로도 된다. 그렇게 했으면 `tasks.md` 에 이유를 적는다.

## 원칙 3 — 검증하지 않은 것은 완료가 아니다

PR 전 DONE 게이트를 전부 통과한다.

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run build
```

실패하면 실패했다고 보고한다. 통과한 것만 통과했다고 말한다.

## 원칙 4 — 저장소가 기억하는 것만 존재한다

Drive 사양서는 갱신되며 과거가 남지 않는다. 참조한 **문서 이름과 확인 날짜**를
`spec.md` 에 문장으로 옮겨 적는다. 링크만 남기지 않는다.

---

## 명명 규칙

| 대상 | 형식 | 예 |
|---|---|---|
| 브랜치 | 티켓 키 | `LF-12` |
| 스펙 디렉터리 | `NNN-slug` | `specs/002-template-editor/` |
| 커밋 제목 | `NNN/LF-nn 요약` | `002/LF-12 Add in-place template editing` |

세 가지가 맞물려 티켓 ↔ 스펙 ↔ 커밋이 서로 추적된다.

## 구현 순서

```
contracts → mock-data → schema/repo → controller ∥ api-client → web
```

## 사람의 승인이 필요한 것 (헌법 VII)

- 운영 DB 파괴적 마이그레이션 · 운영 배포
- 외부 통신(메일·웹훅·결제) · 시크릿 회전

덧붙이는 마이그레이션(기본값 있는 컬럼, 신규 테이블)은 해당하지 않는다.

---

## 이 프로젝트

리드 매그넷 CRM. 운영자가 HTML 템플릿을 등록 → 폼 생성 → 채널별 배포 링크 →
방문자 제출 → 캠페인·채널별 성과 집계.

| | |
|---|---|
| 스택 | Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 |
| 인증 | iron-session 쿠키, 시드된 운영자 1명 |
| 설계 판단 | `doc/adr/` — 특히 **0003 (HTML 격리)** 을 먼저 읽을 것 |
| API 문서 | `doc/openapi.yaml` · 실행 중 `/api-docs` |

### 건드리기 전에 알아야 할 것

- **업로드된 HTML 은 정화하지 않는다.** 격리는 오리진 분리 + 샌드박스 iframe +
  CSP 로 한다 (ADR 0003). 이 전제를 바꾸려면 ADR 부터 고친다.
- **공개 폼은 한국어 고정.** 운영자의 언어 설정이 방문자에게 새면 안 된다 (ADR 0010).
- **채널 색은 색각 이상 검증을 통과한 값**이다. 임의로 바꾸지 않는다.
- 운영 DB 연결은 `.env.production.local` (gitignored). 마이그레이션은 비풀링
  연결로 실행한다.

# 글로우업리즈 과제 — 작업 체크리스트

출처: [`[글로우업리즈]개발자_과제_안내-2.md`](./[글로우업리즈]개발자_과제_안내-2.md)
순서가 중요하다. 각 일자의 체크포인트가 다음 일자의 전제가 된다.

**핵심 산출물:** 운영자가 HTML 을 등록 → 폼 생성 → 채널별 배포 링크 획득 →
방문자 제출 → 대시보드에 방문·방문자·제출·전환율이 **캠페인별 그리고 채널별**로 표시.

---

## 0일차 — 결정과 스캐폴딩 (약 3시간)

### 가정 (각각 나중에 ADR 이 된다)
- [x] 결정: 운영자 계정 1개, 환경변수로 시드, 회원가입 없음
- [x] 결정: 채널 고정 `instagram | x | youtube | threads`, 링크 형식 `/f/{slug}?ch={channel}`
- [x] 결정 및 명문화: 방문 = 페이지 로드, 방문자 = 쿠키 기준 순 방문자, 제출 = 성공한 POST, **전환율 = 제출 ÷ 방문자**
- [x] 결정: HTML 템플릿 계약 (`<form>` 정확히 1개 + 이름 있는 입력 필드, 플랫폼이 채널 히든 필드와 제출 스크립트를 주입)
- [x] 결정: 제출 저장 = `jsonb` + `name/phone/email` 컬럼 추출
- [x] 결정: 격리 = 오리진 분리(`FORM_HOST`) + 샌드박스 iframe + 엄격한 CSP (정화 아님)

### 스캐폴딩
- [x] `create-next-app` (TS, App Router, Tailwind, ESLint)
- [x] 의존성 설치: `prisma @prisma/client @prisma/adapter-pg pg iron-session zod bcryptjs cheerio nanoid`
- [x] 개발 의존성: `vitest`, `tsx`, `dotenv` (Playwright 는 3일차로 미룸)
- [x] `npx prisma init`
- [x] `.env.example` 작성 (DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, APP_HOST, FORM_HOST)
- [x] `docker-compose.yml` — Postgres 단일 서비스 (채점자가 한 줄로 실행)
- [x] 저장소 구조 생성: `/app`, `/lib`, `/prisma`, `/tests`, `/doc`

---

## 1일차 — 데이터 모델 · 인증 · 템플릿 · 폼 (약 7시간)

### 스키마
- [x] 모델: `Operator`, `HtmlTemplate`, `Campaign`, `Form`, `DistributionLink`, `Visit`, `Submission`
- [x] `enum Channel { INSTAGRAM X YOUTUBE THREADS }`
- [x] 제약·인덱스: `Form.slug` 유니크, `@@unique([formId, channel])`, `[formId, channel]` · `[formId, visitorId]` 인덱스
- [x] `npx prisma migrate dev --name init`
- [x] `prisma/seed.ts` — 환경변수의 운영자를 bcrypt 해시로 upsert

### 인증
- [x] `POST /api/auth/login` — bcrypt 검증 → iron-session 쿠키 (`httpOnly`, 운영에서 `secure`, `sameSite=strict`)
- [x] `POST /api/auth/logout`, `GET /api/auth/me`
- [x] `proxy.ts` (Next 16 에서 `middleware` 가 개칭됨) — `/admin/*` → `/login` 리다이렉트, `/api/*` 는 401 (단 `/api/auth/login` · `/api/public/*` 제외)
- [x] `lib/session.ts` 의 `requireSession()` — 보호된 모든 라우트가 사용
- [x] `/login` 페이지

### HTML 템플릿 등록
- [x] `POST /api/templates` — `.html` 만, 200 KB 이하
- [x] cheerio 파싱: `<form>` 정확히 1개 요구, input/select/textarea 의 `name` 수집 → `fieldNames`, 없으면 거부
- [x] 원본 HTML 을 정화 없이 저장 (격리는 정화가 아니라 오리진으로 한다)
- [x] `GET /api/templates`, `GET /api/templates/:id`
- [x] `/admin/templates` 페이지 — 업로드 + 운영과 동일한 샌드박스 iframe 미리보기

### 캠페인과 폼
- [x] `POST /api/campaigns`, `GET /api/campaigns`
- [x] `POST /api/forms` `{campaignId, templateId, title, slug?}` — slug 생략 시 `nanoid(8)` 자동 생성
- [x] 폼 생성과 동시에 `DistributionLink` 4개 자동 생성
- [x] 재생성용 `POST /api/forms/:id/links`
- [x] 페이지: `/admin/campaigns`, `/admin/campaigns/[id]`, `/admin/forms/[id]` (링크 + 복사 버튼)

- [x] **✅ 1일차 체크포인트:** 로그인 → HTML 업로드 → 캠페인 생성 → 폼 생성 → 링크 4개 확인

---

## 2일차 — 공개 폼 · 추적 · 집계 · 대시보드 (약 8시간)

### 공개 폼 페이지 `/f/[slug]`
- [x] 서버 컴포넌트가 폼 + 템플릿 로드, 없거나 비활성이면 404
- [x] `?ch=` 를 enum 으로 검증 (잘못된 값 → `null`, 페이지는 정상 동작)
- [x] `visitor_id` 쿠키 발급 (UUID, 퍼스트파티, 1년) — 서버 컴포넌트는 쿠키를 설정할 수 없으므로 `proxy.ts` 에서 발급
- [x] `Visit` 기록 (formId, channel, visitorId, UA) — DB 오류가 폼을 망가뜨리지 않도록 try/catch
- [x] `<iframe sandbox="allow-forms allow-scripts" src="/f/[slug]/render?ch=…">` 로 템플릿 임베드 (`allow-same-origin` 없음)
- [x] `/f/[slug]/render` 라우트: 히든 `__channel` 주입 + 제출 가로채기 스크립트 주입 후 원본 HTML 반환
- [x] 렌더 라우트에 CSP 설정, 이 라우트에서는 세션 쿠키를 절대 읽지 않음
- [x] 제출 스크립트: 폼 직렬화 → JSON → POST → 감사 메시지로 교체

### 공개 제출 API
- [x] `POST /api/public/forms/[slug]/submissions`
- [x] Zod 검증: 키가 `template.fieldNames` 의 부분집합 (그 외 키 → 400)
- [x] IP + slug 기준 레이트 리밋 (분당 10회)
- [x] 필드명이 일치하면 `name/phone/email` 추출
- [x] 제출 저장 → `201 {id}`
- [x] 오류 처리: 없는 slug 404, 비활성 폼 410, 잘못된 본문 400, 한도 초과 429
- [x] `Origin` 검증 — `null`(샌드박스 iframe 의 불투명 출처) · `FORM_HOST` · `APP_HOST` 허용, 그 외 403. CORS 프리플라이트 처리

### 집계 (`lib/stats.ts`)
- [x] 캠페인별 집계 쿼리: 방문, 순 방문자, 제출
- [x] 같은 쿼리의 채널별 변형
- [x] 전환율 = 제출 ÷ 방문자, 0 나누기 방어
- [x] `GET /api/stats/campaigns`
- [x] `GET /api/stats/campaigns/:id/channels`
- [x] 선택적 `?from=&to=` 날짜 필터

### 대시보드
- [x] `/admin` — 캠페인 표 (방문 / 방문자 / 제출 / 전환율)
- [x] `/admin/campaigns/[id]` — 채널 표 + 막대 그래프 + 폼 목록 (막대는 recharts 가 아닌 div, ADR 0008 참고)
- [x] `/admin/forms/[id]/submissions` — CRM 목록 (이름, 연락처, 이메일, 채널, 일시, 펼칠 수 있는 JSON)
- [x] CSV 내보내기 `GET /api/forms/:id/submissions?format=csv`

- [x] **✅ 2일차 체크포인트:** 시크릿 창으로 링크 열기 → 제출 → 대시보드 숫자 변동, 채널 2개로 귀속 확인

---

## 3일차 — 보안 · 테스트 · 문서 · 제출 (약 8시간)

### 보안 점검 (비기능 요구사항 #1)
- [x] 세션 쿠키 `httpOnly`, `sameSite=strict`, `path=/`, APP_HOST 스코프
- [x] 운영에서 공개 폼은 별도 오리진(FORM_HOST), 개발에서도 iframe 샌드박스 유지
- [x] `allow-same-origin` 없는 샌드박스 → 템플릿 JS 는 불투명 출처
- [x] 렌더 라우트에 CSP 적용
- [x] 공개가 아닌 모든 `/api/*` 라우트가 `requireSession()` 호출
- [x] 공개 제출 엔드포인트가 `Origin` 검증
- [x] 템플릿 업로드가 비 HTML · 용량 초과 · `<form>` 없는 파일을 거부
- [x] 네거티브 테스트: `<script>fetch('/api/stats/campaigns')</script>` 를 담은 템플릿이 쿠키 없이 401, E2E 에서 부모 `document.cookie` 접근 불가

### 테스트
**단위 (Vitest)**
- [x] `stats.ts`: 방문자 중복 제거, 전환율 반올림, 0 나누기
- [x] 템플릿 파싱: 필드 추출, `<form>` 없는 HTML 거부

**API (Vitest + `DATABASE_URL_TEST`)**
- [x] 로그인 성공 / 비밀번호 오류 401 / 세션 없이 `/api/campaigns` 401
- [x] 템플릿 업로드: 정상 201, 비 HTML 400, `<form>` 없음 400
- [x] 폼 생성 시 채널 쿼리가 올바른 링크 4개 생성
- [x] 공개 제출: 201 / 404 / 410 / 400 / 429
- [x] 집계: 방문 3건(방문자 2명) + 제출 1건 → 방문자 2, 전환율 0.5, 채널 분리 정확

**E2E (Playwright)**
- [x] 로그인 → 템플릿 업로드 → 캠페인·폼 생성 → 인스타그램 링크 복사 → 새 컨텍스트로 방문 → 제출 → 대시보드 1/1/1/100%, 인스타그램 행 = 1

**인프라**
- [x] `npm test` (단위 + API), `npm run test:e2e` 스크립트
- [x] Postgres 서비스 컨테이너로 `npm test` 를 돌리는 GitHub Actions 워크플로

### 문서
- [x] `doc/openapi.yaml` — 과제가 명시한 5개 그룹(인증, 폼 관리, 공개 제출, 배포 링크, 성과) 전부, 요청/응답 스키마와 오류 코드 포함
- [x] `/api-docs` Swagger UI — 자체 호스팅(CDN 없이 오프라인 동작)
- [x] ADR 0001 — 기술 스택 (Next.js + Prisma + Postgres) → `doc/adr/`
- [x] ADR 0002 — 운영자 1계정, JWT 대신 쿠키 세션
- [x] ADR 0003 — HTML 격리 전략 (오리진 + 샌드박스 + CSP, 정화 아님)
- [x] ADR 0004 — 방문 / 방문자 / 전환율 정의
- [x] ADR 0005 — 제출 저장: JSONB + 추출된 CRM 컬럼
- [x] ADR 0006 — 고정 4채널, `?ch=` 링크 형식
- [x] ADR 0007 — 채널 히든 필드 + 제출 스크립트 주입
- [x] ADR 0008 — 범위 밖 항목과 가정
- [x] README — **실행 방법**과 **테스트 방법만**, 그 외에는 넣지 않음

### 배포
- [x] Vercel + Neon 배포 — 운영 중, 마이그레이션 적용, 운영자 시드 완료
- [x] `FORM_HOST` 용 두 번째 도메인 — `glowup-forms.vercel.app`, 오리진 격리를 배포본에서 확인
- [ ] developer@glowuprizz.com 으로 제출 메일 발송 — **직접 보낼 것**

---

## 시간이 부족할 때 버리는 순서

1. 데모 배포
2. recharts 차트 (표는 유지)
3. CSV 내보내기
4. 집계 날짜 필터
5. Playwright E2E (API 테스트는 유지 — 성공·실패 흐름을 이미 덮는다)

**절대 버리지 않는 것:** 인증 가드 · iframe/오리진 격리 · 배포 링크 4개 ·
캠페인별·채널별 방문/방문자/제출 집계 · ADR · README

---

## 시간 배분

| 구간 | 시간 |
|---|---|
| 0일차 — 스캐폴딩 + 가정 정리 | 3 |
| 1일차 — 스키마 / 인증 / 템플릿 / 폼 | 7 |
| 2일차 — 공개 폼 / 추적 / 집계 / 대시보드 | 8 |
| 3일차 — 보안 / 테스트 / 문서 / 배포 / 제출 | 8 |

---

## 개발 환경 메모

- **Postgres 는 호스트 포트 `5434`** 를 쓴다(5432 아님). 5432 는 Homebrew
  `postgresql@18` 서비스가, 5433 은 다른 프로젝트 컨테이너(`gdp-schema-mission`)가
  점유 중이며 둘 다 그대로 두었다. `docker-compose.yml` 과 `.env.example` 이 같은
  포트를 쓰므로 `npm run db:up` 이 바로 동작한다.
- **Prisma 7** 은 드라이버 어댑터(`@prisma/adapter-pg`)를 명시적으로 요구한다.
  `lib/db.ts` 와 `prisma/seed.ts` 에서 어댑터와 함께 생성한다. 클라이언트는
  TypeScript 로 `generated/prisma/` 에 생성되며(gitignore 대상), 따라서
  `prisma generate` 가 `npm run build` 에 포함된다.
- **Next.js 16** 에서 `middleware.ts` 가 `proxy.ts` 로 개칭됐다. 가드는 `proxy.ts` 에 있다.
- `npm audit` 이 high 4건을 보고하지만 전부 `prisma` 의 전이 의존성인 `mysql2` 안에
  있다(CLI 전용이며 이 프로젝트는 Postgres 를 쓴다). 해결하려면 Prisma 를 6.x 로
  내려야 하므로 하지 않았다.

---

## 원래 계획과 달라진 구현 결정

| 계획 | 실제 구현 | 이유 |
|---|---|---|
| 페이지 서버 코드에서 방문 기록 | 방문은 페이지에서, `visitor_id` 는 `proxy.ts` 에서 발급 | Next 15+ 서버 컴포넌트는 쿠키를 설정할 수 없다 |
| 제출이 `visitor_id` 쿠키를 실어 보냄 | 방문자 식별자를 히든 필드 `__visitor` 로 주입 | 샌드박스는 불투명 출처라 쿠키를 전혀 보내지 않는다 |
| `Origin === FORM_HOST` 만 허용 | `Origin: null` 도 허용하고 CORS 프리플라이트 처리 | 샌드박스 iframe 의 fetch 는 항상 `Origin: null` 이다 |
| recharts 막대 그래프 | div 로 만든 막대 그래프 | 지표 하나에 막대 4개다. 클라이언트 차트 의존성을 더할 이유가 없다 |
| 상관 서브쿼리를 포함한 단일 SQL | CTE 두 개를 나중에 조인 | 방문과 제출을 직접 조인하면 행이 곱해져 양쪽 수치가 부풀려진다 |

---

## 추가 기능 (2026-09-12)

계획과 작업 목록: [`PLAN-editor-i18n.md`](PLAN-editor-i18n.md) ·
명세: [`../specs/`](../specs/)

- [x] 템플릿 인앱 편집기 — 코드 + 실시간 미리보기, 제자리 저장
- [x] 버전 기록 및 복원 (`TemplateVersion`)
- [x] 입력 필드 삭제 시 영향 건수와 함께 확인
- [x] 다국어 (한국어 / English, 쿠키 기반)
- [x] 운영 DB 마이그레이션 적용
- [x] 디자인 시스템 정리 — 색각 이상 검증을 통과한 채널 팔레트
- [x] 배포본 대상 스모크 스위트 (`npm run test:prod`)
- [x] SDD × AIDD 개발 프로세스 구조화 (`.specify/`, `specs/`, `CLAUDE.md`)

---

## 최종 상태

미완료 항목은 제출 메일 발송 하나이며, 이는 직접 보내야 하는 일이다.

### 검증 결과

| 게이트 | 명령 | 결과 |
|---|---|---|
| 타입 | `npm run typecheck` | 통과 |
| 린트 | `npm run lint` | 통과 (경고 0) |
| 단위 + API | `npm test` | **131건 통과** (15개 파일) |
| 브라우저 E2E | `npm run test:e2e` | **5건 통과** |
| 배포본 스모크 | `npm run test:prod` | **6건 통과** |
| 프로덕션 빌드 | `npm run build` | 성공 |

### 절대 버리지 않기로 한 항목 — 전부 존재

- [x] 공개가 아닌 모든 라우트의 인증 가드 (`requireSession()` + `proxy.ts`)
- [x] iframe / 오리진 격리 (`allow-same-origin` 없는 샌드박스, CSP, 운영에서 별도 호스트)
- [x] 폼마다 자동 생성되는 배포 링크 4개
- [x] 캠페인별 **그리고** 채널별 방문 / 방문자 / 제출 집계
- [x] `doc/adr/` 의 ADR 10건
- [x] 실행 방법 + 테스트 방법을 담은 README

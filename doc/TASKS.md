# 글로우업리즈 과제 — Task Checklist

Derived from [`[글로우업리즈]개발자_과제_안내-2.md`](./[글로우업리즈]개발자_과제_안내-2.md).
Order matters: each day's checkpoint gates the next day.

**Core deliverable:** operator registers an HTML → makes a form → gets channel links → a visitor submits → dashboard shows visits / visitors / submissions / conversion, per campaign *and* per channel.

---

## Day 0 — Decide & scaffold (~3 h)

### Assumptions (each becomes an ADR later)
- [x] Decide: one operator account, seeded from env, no signup
- [x] Decide: fixed channels `instagram | x | youtube | threads`, link format `/f/{slug}?ch={channel}`
- [x] Decide & write down metric definitions: visit = page load, visitor = unique cookie, submission = successful POST, **conversion = submissions ÷ visitors**
- [x] Decide: HTML template contract (exactly one `<form>` with named inputs; platform injects hidden channel + submit script)
- [x] Decide: submission storage = `jsonb` + extracted `name/phone/email` columns
- [x] Decide: isolation = separate origin (`FORM_HOST`) + sandboxed iframe + strict CSP (not sanitization)

### Scaffold
- [x] `create-next-app` (TS, App Router, Tailwind, ESLint)
- [x] Install deps: `prisma @prisma/client @prisma/adapter-pg pg iron-session zod bcryptjs cheerio nanoid`
- [x] Install dev deps: `vitest`, `tsx`, `dotenv` (Playwright deferred to Day 3)
- [x] `npx prisma init`
- [x] Write `.env.example` (DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, APP_HOST, FORM_HOST)
- [x] `docker-compose.yml` with a single Postgres service (one-command startup for graders)
- [x] Create repo layout: `/app`, `/lib`, `/prisma`, `/tests`, `/docs`

---

## Day 1 — Data model, auth, templates, forms (~7 h)

### Schema
- [x] Models: `Operator`, `HtmlTemplate`, `Campaign`, `Form`, `DistributionLink`, `Visit`, `Submission`
- [x] Enum `Channel { INSTAGRAM X YOUTUBE THREADS }`
- [x] Constraints/indexes: `Form.slug` unique, `@@unique([formId, channel])`, indexes on `[formId, channel]` and `[formId, visitorId]`
- [x] `npx prisma migrate dev --name init`
- [x] `prisma/seed.ts` — upsert operator from env with bcrypt hash

### Auth
- [x] `POST /api/auth/login` — bcrypt verify → iron-session cookie (`httpOnly`, `secure` in prod, `sameSite=strict`)
- [x] `POST /api/auth/logout`, `GET /api/auth/me`
- [x] `proxy.ts` (Next 16 renamed `middleware`) — redirect `/admin/*` → `/login`; 401 on `/api/*` except `/api/auth/login` and `/api/public/*`
- [x] `requireSession()` helper in `lib/session.ts` (used by every protected route)
- [x] `/login` page

### HTML template registration
- [x] `POST /api/templates` — accept `.html` only, ≤ 200 KB
- [x] Parse with cheerio: require exactly one `<form>`, collect input/select/textarea `name`s → `fieldNames`, reject if none
- [x] Store raw HTML unsanitized (isolation is by origin, not sanitization)
- [x] `GET /api/templates`, `GET /api/templates/:id`
- [x] `/admin/templates` page — upload + preview in the same sandboxed iframe used in production

### Campaigns & forms
- [x] `POST /api/campaigns`, `GET /api/campaigns`
- [x] `POST /api/forms` `{campaignId, templateId, title, slug?}` — auto slug via `nanoid(8)`
- [x] Auto-generate the 4 `DistributionLink`s on form creation
- [x] `POST /api/forms/:id/links` for regeneration
- [x] Pages: `/admin/campaigns`, `/admin/campaigns/[id]`, `/admin/forms/[id]` (links + copy buttons)

- [x] **✅ Day 1 checkpoint:** log in → upload HTML → create campaign → create form → see 4 links

---

## Day 2 — Public form, tracking, stats, dashboard (~8 h)

### Public form page `/f/[slug]`
- [x] Server component loads form + template; 404 if missing/inactive
- [x] Validate `?ch=` against enum (invalid → `null`, page still works)
- [x] Ensure `visitor_id` cookie (UUID, first-party, 1 year) — minted in `proxy.ts`, since server components cannot set cookies
- [x] Record a `Visit` (formId, channel, visitorId, UA) — wrapped in try/catch so DB errors never break the form
- [x] Embed template via `<iframe sandbox="allow-forms allow-scripts" src="/f/[slug]/render?ch=…">` (no `allow-same-origin`)
- [x] `/f/[slug]/render` route: inject hidden `__channel` input + submit-intercept script, return raw HTML
- [x] Set CSP on the render route: `default-src 'self'; form-action 'self'; frame-ancestors ${APP_HOST}`; never read the session cookie here
- [x] Submit script: serialize form → JSON → POST → swap form for thank-you message

### Public submission API
- [x] `POST /api/public/forms/[slug]/submissions`
- [x] Zod validation: keys ⊆ `template.fieldNames` (extra keys → 400)
- [x] Rate limit by IP + slug (~10/min)
- [x] Extract `name/phone/email` when field names match
- [x] Insert submission → `201 {id}`
- [x] Error cases: unknown slug 404, inactive form 410, invalid body 400, rate limited 429
- [x] Validate `Origin` — accepts `null` (the sandboxed iframe's opaque origin), `FORM_HOST`, `APP_HOST`; everything else 403. CORS preflight handled.

### Stats (`lib/stats.ts`)
- [x] Per-campaign aggregate query: visits, distinct visitors, submissions
- [x] Per-channel variant of the same query
- [x] Conversion = submissions ÷ visitors, guard zero-division
- [x] `GET /api/stats/campaigns`
- [x] `GET /api/stats/campaigns/:id/channels`
- [x] Optional `?from=&to=` date filter

### Dashboard
- [x] `/admin` — campaign table (visits / visitors / submissions / conversion %)
- [x] `/admin/campaigns/[id]` — channel table + bar chart + forms list (bar chart built from divs, not recharts — see ADR 0008)
- [x] `/admin/forms/[id]/submissions` — CRM list (name, phone, email, channel, date, expandable JSON)
- [x] CSV export `GET /api/forms/:id/submissions?format=csv`

- [x] **✅ Day 2 checkpoint:** open a link in incognito → submit → dashboard numbers move; verify channel attribution with 2 different channels

---

## Day 3 — Security, tests, docs, submission (~8 h)

### Security checklist (비기능 요구사항 #1)
- [x] Session cookie `httpOnly`, `sameSite=strict`, `path=/`, scoped to APP_HOST
- [x] Public form on a separate origin (FORM_HOST) in prod; iframe-sandboxed in dev
- [x] Iframe sandbox without `allow-same-origin` → opaque origin for template JS
- [x] CSP set on the render route
- [x] Every non-public `/api/*` route calls `requireSession()`
- [x] Public submission endpoint validates `Origin`
- [x] Template upload rejects non-HTML, oversized, and formless files
- [x] Negative test: template containing `<script>fetch('/api/stats/campaigns')</script>` → 401 without cookie, and cannot read parent `document.cookie` in E2E

### Tests
**Unit (Vitest)**
- [x] `stats.ts`: visitor dedup, conversion rounding, zero-division
- [x] Template parsing: field extraction, formless HTML rejected

**API (Vitest + `DATABASE_URL_TEST`)**
- [x] Login success / wrong password 401 / no session on `/api/campaigns` 401
- [x] Template upload: valid 201, non-html 400, no `<form>` 400
- [x] Form creation generates 4 links with correct channel query params
- [x] Public submission: 201 / 404 / 410 / 400 / 429
- [x] Stats: 3 visits (2 visitors) + 1 submission → visitors=2, conversion=0.5; channel split correct

**E2E (Playwright, 1 spec)**
- [x] login → upload template → create campaign+form → copy instagram link → new context visits → submits → dashboard shows 1/1/1/100% and instagram row = 1

**Infra**
- [x] `npm test` (unit + API) and `npm run test:e2e` scripts
- [x] GitHub Actions workflow running `npm test` with a Postgres service container

### Documentation
- [x] `doc/openapi.yaml` covering all 5 groups: auth, form management, public submission, distribution links, performance stats — with request/response schemas and error codes
- [x] Swagger UI at `/api-docs`, self-hosted (no CDN, works offline)
- [x] ADR 0001 — Tech stack (Next.js + Prisma + Postgres) → `doc/adr/`
- [x] ADR 0002 — Single seeded operator, cookie session over JWT
- [x] ADR 0003 — HTML isolation strategy (origin + sandbox + CSP, not sanitization)
- [x] ADR 0004 — Visit / visitor / conversion definitions
- [x] ADR 0005 — Submission storage as JSONB + extracted CRM columns
- [x] ADR 0006 — Fixed 4 channels, `?ch=` link format
- [x] ADR 0007 — Hidden channel field + submit script injection
- [x] ADR 0008 — Out-of-scope items and assumptions
- [x] README with **실행 방법** and **테스트 방법 only** — nothing else

### Ship
- [x] Vercel + Neon deploy — live, migrations applied, operator seeded
- [x] Second domain for `FORM_HOST` — `glowup-forms.vercel.app`, origin isolation verified live
- [ ] Email developer@glowuprizz.com — **yours to send**

---

## Cut list (drop in this order if short on time)
1. Demo deploy
2. Recharts chart (keep the table)
3. CSV export
4. Date filters on stats
5. Playwright E2E (keep API tests — they still cover success + failure flows)

**Never cut:** auth guard · iframe/origin isolation · the 4 distribution links · visit/visitor/submission stats per campaign & channel · ADRs · README

---

## Time budget

| Block | Hours |
|---|---|
| Day 0 — scaffold + assumptions | 3 |
| Day 1 — schema / auth / templates / forms | 7 |
| Day 2 — public form / tracking / stats / dashboard | 8 |
| Day 3 — security / tests / docs / deploy / submit | 8 |

---

## Environment notes (local machine)

- **Postgres runs on host port `5434`**, not 5432. Port 5432 is held by a Homebrew
  `postgresql@18` service and 5433 by another project's container (`gdp-schema-mission`),
  both left running. `docker-compose.yml` and `.env.example` agree on 5434, so
  `npm run db:up` works out of the box.
- **Prisma 7** requires an explicit driver adapter (`@prisma/adapter-pg`) — the client is
  constructed with one in `lib/db.ts` and `prisma/seed.ts`. It also generates TypeScript
  into `generated/prisma/` (gitignored), so `prisma generate` runs as part of `npm run build`.
- **Next.js 16** renamed `middleware.ts` → `proxy.ts`; the guard lives in `proxy.ts`.
- `npm audit` reports 4 high advisories, all inside `prisma`'s transitive `mysql2`
  dependency (CLI-only, and this project uses Postgres). Fixing requires downgrading
  Prisma to 6.x — not done.

## Implementation decisions that differ from the original plan

| Plan said | Built instead | Why |
|---|---|---|
| Record visit in page server code | Visit recorded in the page; `visitor_id` minted in `proxy.ts` | Server components cannot set cookies in Next 15+ |
| Submission carries `visitor_id` cookie | Visitor id injected as a hidden `__visitor` field | The sandbox has an opaque origin, so it sends no cookies |
| Endpoint accepts `Origin === FORM_HOST` | Also accepts `Origin: null` + CORS preflight | A sandboxed iframe's fetch always reports `Origin: null` |
| recharts bar chart | Bar chart built from divs | Four bars of one metric; avoids a client-side chart dependency |
| Single SQL with a correlated subquery | Two CTEs joined afterwards | Joining visits and submissions directly multiplies rows and inflates both counts |

---

## Final status — 2026-09-11

**89 of 92 tasks complete.** The three open items are the optional demo deploy,
its dependent second domain, and sending the submission email — all of which need
your accounts or credentials.

### 추가 기능 (2026-09-12)

계획과 작업 목록: [`PLAN-editor-i18n.md`](PLAN-editor-i18n.md)

- [x] 템플릿 인앱 편집기 — 코드 + 실시간 미리보기, 제자리 저장
- [x] 버전 기록 및 복원 (`TemplateVersion`)
- [x] 입력 필드 삭제 시 영향 건수와 함께 확인
- [x] 다국어 (한국어 / English, 쿠키 기반)
- [x] 운영 DB 마이그레이션 적용

### Verification run

| Gate | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | clean |
| Lint | `npm run lint` | clean |
| Unit + API | `npm test` | **105 passed** (13 files) |
| Browser E2E | `npm run test:e2e` | **3 passed** |
| Production build | `npm run build` | succeeds, 18 routes |

### Never-cut list — all present

- [x] Auth guard on every non-public route (`requireSession()` + `proxy.ts`)
- [x] Iframe / origin isolation (sandbox without `allow-same-origin`, CSP, separate host in prod)
- [x] Four distribution links, auto-generated per form
- [x] Visit / visitor / submission stats per campaign **and** per channel
- [x] 8 ADRs in `doc/adr/`
- [x] README with 실행 방법 + 테스트 방법

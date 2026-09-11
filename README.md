# Lead Magnet CRM

글로우업리즈 개발자 과제 — HTML 템플릿 기반 리드 수집 및 채널별 성과 분석 플랫폼.

운영자가 HTML을 등록 → 폼 생성 → 채널별 배포 링크 획득 → 방문자 제출 →
캠페인·채널별 방문/방문자/제출/전환율 확인.

## 데모

| | |
|---|---|
| 관리 화면 | https://glowup-admin-app.vercel.app |
| 공개 폼 | https://glowup-forms.vercel.app |
| API 문서 | https://glowup-admin-app.vercel.app/api-docs |
| 계정 | `admin@example.com` / `admin1234` |

관리 화면과 공개 폼이 **서로 다른 도메인**에서 서빙됩니다. 업로드된 템플릿이
실행되는 오리진에는 세션 쿠키가 구조적으로 존재할 수 없습니다
([ADR 0003](doc/adr/0003-html-isolation.md)).

---

## 실행

```bash
# 1. 환경변수
cp .env.example .env

# 2. PostgreSQL (Docker)
npm run db:up

# 3. 의존성
npm install

# 4. 마이그레이션 + 운영자 계정 시드
npx prisma migrate deploy
npm run db:seed

# 5. 개발 서버
npm run dev
```

→ http://localhost:3000/login

| | |
|---|---|
| 계정 | `admin@example.com` / `admin1234` |
| API 문서 | http://localhost:3000/api-docs |

> **포트 안내** — PostgreSQL 컨테이너는 호스트의 **5434** 포트에 바인딩됩니다.
> 개발 기기에서 5432와 5433이 이미 사용 중이었기 때문이며, `.env.example` 과
> `docker-compose.yml` 이 같은 값을 쓰므로 추가 설정은 필요 없습니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

> **오리진 분리** — 운영 환경에서는 `FORM_HOST` 를 `APP_HOST` 와 **다른 도메인**으로
> 지정하세요. 공개 폼이 관리 화면과 다른 오리진에서 서빙되어야 세션 쿠키가 구조적으로
> 도달할 수 없습니다 (`doc/adr/0003-html-isolation.md`). 변경 후
> `POST /api/forms/:id/links` 로 배포 링크를 재생성합니다.

---

## 테스트

```bash
npm test           # 단위 + API 테스트 (Vitest, 105건)
npm run test:e2e   # 로컬 브라우저 E2E (Playwright, 3건)
npm run test:prod  # 배포된 데모에 대한 스모크 테스트 (6건)
```

`test:prod` 는 서버를 띄우지 않고 **배포본**을 그대로 검사합니다. 생성한 데이터에는
`[smoke]` 접두사가 붙으며 `npm run clean:prod` 로 정리할 수 있습니다 (정리에는
`.env.production.local` 의 `DATABASE_URL_UNPOOLED` 가 필요합니다).

두 명령 모두 `DATABASE_URL_TEST` 데이터베이스를 사용하며, 개발 데이터에는
영향을 주지 않습니다. 마이그레이션은 테스트 실행 시 자동 적용됩니다.

```bash
npm run test:unit   # 순수 로직만 (DB 불필요)
npm run test:api    # 라우트 핸들러 + DB
npm run typecheck
npm run lint
```

E2E는 최초 1회 브라우저 설치가 필요합니다:

```bash
npx playwright install chromium
```

### 테스트 범위

| 대상 | 내용 |
|---|---|
| 성공 플로우 | 로그인 → 템플릿 업로드 → 캠페인·폼 생성 → 링크 4개 → 제출 → 대시보드 집계 |
| 인증 실패 | 비밀번호 오류 · 미인증 API 접근 · 세션 만료 (401) |
| 입력 검증 | `<form>` 없음 · 비 HTML · 200KB 초과 · 템플릿에 없는 필드 (400) |
| 상태 오류 | 없는 폼 (404) · 비활성 폼 (410) · slug 중복 (409) |
| 남용 방지 | 분당 10회 초과 (429) · 허용되지 않은 Origin (403) |
| 집계 정확성 | 방문자 중복 제거 · 0 나누기 · 채널 귀속 · 날짜 필터 |
| **격리** | 악성 템플릿이 쿠키·부모 문서·관리 API에 접근하지 못함 (E2E 포함) |

---

## 문서

| | |
|---|---|
| API 명세 | [`doc/openapi.yaml`](doc/openapi.yaml) · 실행 중에는 `/api-docs` |
| 설계 판단 | [`doc/adr/`](doc/adr/) — 가정과 트레이드오프 |
| 작업 목록 | [`doc/TASKS.md`](doc/TASKS.md) |

구현하지 않은 항목과 알려진 한계는
[`doc/adr/0008-out-of-scope.md`](doc/adr/0008-out-of-scope.md) 에 정리되어 있습니다.

# ADR 0001 — 기술 스택: Next.js + Prisma + PostgreSQL 단일 저장소

- 상태: 채택
- 날짜: 2026-09-11

## 배경

3일 안에 운영자용 관리 UI, 방문자용 공개 폼, 성과 집계 API를 모두 제출해야 한다.
과제 요구사항은 Node.js 기반 구현, DB 스키마와 마이그레이션, API 문서를 명시한다.

## 결정

Next.js 16 (App Router, TypeScript) 단일 저장소에 관리 UI와 API를 함께 둔다.
데이터베이스는 PostgreSQL, ORM은 Prisma 7을 사용한다.

- **단일 저장소** — 프론트/백엔드를 나누면 CORS 설정, 배포 파이프라인, 타입 공유가
  각각 별도 작업이 된다. 3일 예산에서 이 비용은 기능 하나에 해당한다.
- **관계형 DB** — 캠페인 → 폼 → 방문/제출은 명확한 1:N 관계이고, 성과 집계는
  `COUNT(DISTINCT …)` 와 `GROUP BY` 로 표현하는 것이 가장 직접적이다.
- **Prisma** — 마이그레이션이 요구사항이며, Prisma는 스키마 파일 하나로
  마이그레이션과 타입 안전 클라이언트를 동시에 제공한다. 집계 쿼리는 Prisma의
  추상화 대신 `$queryRaw` 로 직접 작성한다 ([[0004]] 참고).

## 결과

- 폼 제출 API가 관리 API와 같은 오리진에 존재하게 되므로, 격리를 별도로 설계해야
  한다 → ADR 0003.
- Prisma 7은 드라이버 어댑터(`@prisma/adapter-pg`)를 명시적으로 요구하고,
  생성된 클라이언트가 TypeScript 소스이므로 `generated/` 를 빌드 산출물로 취급한다.
- Next 16에서 `middleware.ts` 규약이 `proxy.ts` 로 변경되어 그에 맞춰 작성했다.

## 검토한 대안

- **Express + React 분리** — 익숙하지만 배포 대상이 둘로 늘고, 타입 공유를 위해
  별도 패키지가 필요하다. 과제 규모에서 이득이 없다.
- **NestJS** — 구조는 훌륭하나 보일러플레이트 비용이 3일 예산에 비해 크다.
- **SQLite** — 설치가 간단하지만 `COUNT(DISTINCT)` 성능과 `jsonb` 지원에서
  PostgreSQL이 명확히 낫고, 채점자는 `docker compose up` 한 줄이면 된다.

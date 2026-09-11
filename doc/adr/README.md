# Architecture Decision Records

이 프로젝트의 설계 판단과 그 이유를 기록합니다. 각 문서는
배경(Context) · 결정(Decision) · 결과(Consequences) · 검토한 대안 형식을 따릅니다.

| # | 제목 | 요약 |
|---|---|---|
| [0001](0001-tech-stack.md) | 기술 스택 | Next.js + Prisma + PostgreSQL 단일 저장소 |
| [0002](0002-single-operator-cookie-session.md) | 인증 | 운영자 1계정, JWT 대신 암호화 쿠키 세션 |
| [0003](0003-html-isolation.md) | **HTML 격리** | 정화가 아닌 오리진 분리 + 샌드박스 + CSP |
| [0004](0004-metric-definitions.md) | 지표 정의 | 방문 · 방문자 · 전환율(= 제출 ÷ 방문자) |
| [0005](0005-submission-storage.md) | 제출 저장 | JSONB + 추출된 CRM 컬럼 |
| [0006](0006-fixed-channels.md) | 채널 | 고정 4채널, `?ch=` 링크 형식 |
| [0007](0007-template-injection.md) | 템플릿 주입 | 히든 필드 + 제출 스크립트 |
| [0008](0008-out-of-scope.md) | 범위 밖 | 하지 않은 것과 알려진 한계 |

가장 먼저 읽을 문서는 **0003 (HTML 격리)** 입니다 — 과제의 비기능 요구사항 1번에
직접 대응하며, 다른 여러 결정이 여기서 파생됩니다.

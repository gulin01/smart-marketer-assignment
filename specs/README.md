# specs/

SDD(Spec-Driven Development) 산출물. 코드보다 먼저 존재하고, 구현이 스펙과
어긋나면 코드가 아니라 스펙을 고친다 (헌법 원칙 I).

## 구조

```
specs/NNN-slug/
  spec.md    무엇을·왜 — 사용자에게 보이는 동작
  plan.md    어떻게 — 데이터 모델, API 계약, 대안
  tasks.md   순서 — 검증 가능한 단위로 쪼갠 작업
```

## 목록

| # | 티켓 | 제목 | 상태 |
|---|---|---|---|
| [001](001-lead-capture-platform/spec.md) | `LF-1` | 리드 수집 플랫폼 | implemented |
| [002](002-template-editor/spec.md) | `LF-12` | 템플릿 인앱 편집기 | implemented |
| [003](003-admin-i18n/spec.md) | `LF-13` | 관리 화면 다국어 | implemented |

## 새 피쳐 시작

```bash
.specify/scripts/new-feature.sh <slug> <티켓>
git switch -c LF-nn
```

또는 `/speckit-specify LF-nn`.

## 이 문서들의 작성 시점에 관하여

001 은 **구현이 끝난 뒤 역으로 정리한 문서**다. 초기 구현은 `doc/TASKS.md` 의
일자별 계획과 `doc/adr/` 의 결정 기록을 따라 진행됐고, 여기 있는 spec/plan/tasks 는
그 실제 산출물과 커밋 이력을 옮겨 적은 것이다. 날짜는 실제 작성일(2026-09-12)이며
소급 표기하지 않았다.

002·003 부터는 이 워크플로를 따라 명세가 먼저 작성됐다.

구분을 남기는 이유는 헌법 원칙 VI 과 같다 — 저장소가 기억하는 것만 존재하고,
기억을 꾸미면 그 기록 전체를 믿을 수 없게 된다.

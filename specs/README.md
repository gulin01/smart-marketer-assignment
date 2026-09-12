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

## 작성 시점 표기

각 스펙은 **명세가 먼저 쓰였는지, 구현 뒤에 정리됐는지**를 구분해 적는다.

| # | 작성 시점 |
|---|---|
| 001 | 구현 후 정리 — `doc/TASKS.md` 의 일자별 계획과 `doc/adr/` 의 결정 기록에서 옮겨 적음 |
| 002 · 003 | 명세 우선 — 이 워크플로를 따라 작성 |

날짜는 실제 작성일이며 소급 표기하지 않는다. 헌법 원칙 VI 이 Drive 사양서에 요구하는
것과 같은 기준을 이 저장소 자신에게도 적용한 것이다 — **날짜를 신뢰할 수 없는 기록은
기록이 아니다.** 순서를 꾸미면 여기 있는 ADR 과 결정 표까지 함께 의심받는다.

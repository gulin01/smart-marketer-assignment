---
description: plan.md 를 구현 가능한 작업 목록으로 쪼갠다
---

대상: `$ARGUMENTS`. 없으면 가장 최근 spec.

1. `spec.md` 와 `plan.md` 를 읽는다.
2. 구현 순서를 지켜 작업을 나눈다:
   `contracts → mock-data → schema/repo → controller ∥ api-client → web`
3. 각 작업은 **독립적으로 검증 가능**해야 한다. "UI 만들기" 는 작업이 아니다.
4. 각 동작에 대해 **성공 경로와 실패 경로 테스트**를 각각 작업으로 넣는다 (헌법 IV).
5. 마지막 작업은 항상 DONE 게이트 실행이다.
6. 소형 피쳐라면 `plan.md` 없이 spec → tasks 만으로도 된다. 그렇게 했으면
   `tasks.md` 상단에 이유를 적는다.

---
description: Jira 티켓과 Drive 사양서를 읽어 specs/NNN-*/spec.md 를 작성한다
---

인자: 티켓 키(`LF-nn`) 또는 피쳐 설명. 없으면 무엇을 명세할지 먼저 묻는다.

1. **티켓 조회** — Atlassian MCP 로 `$ARGUMENTS` 티켓을 읽는다. 없으면 사람에게
   티켓 키를 묻고 **멈춘다**.
2. **사양서 조회** — Drive MCP 로 관련 사양서를 찾아 읽는다.
   - 사양서가 없거나 해당 부분이 비어 있으면 **멈추고 사람에게 확인한다** (헌법 V).
   - 찾은 문서의 **이름과 오늘 날짜**를 기록해 둔다 (헌법 VI).
3. **디렉터리 생성** — `.specify/scripts/new-feature.sh <slug> <티켓>`
4. **spec.md 작성** — `.specify/templates/spec-template.md` 구조를 따른다.
   - 사양서 내용은 링크가 아니라 **문장으로 옮겨 적는다**.
   - 구현 방법이 아니라 **사용자에게 보이는 동작**을 쓴다.
   - 모호한 지점은 지어내지 말고 `## 열린 질문` 에 남긴다.
5. SPEC 게이트(`.specify/memory/gates.md`)를 스스로 점검하고 결과를 보고한다.

작성 후 `/speckit-clarify` 를 권한다. 열린 질문이 없다면 바로 `/speckit-plan`.

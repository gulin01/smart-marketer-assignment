# 수동 QA 결과 — 배포본

- 일시: 2026-09-11
- 방식: 브라우저 수동 테스트 (Claude in Chrome)
- 대상: `glowup-admin-app.vercel.app` · `glowup-forms.vercel.app` · `smart-marketer-assignment.vercel.app`

## 결과 요약

8단계 중 7단계 통과, 1단계는 증거 미확보로 보류되었다가 이후 자동 테스트로 확인됨.

| # | 항목 | 결과 |
|---|---|---|
| 1 | 레거시 도메인 리다이렉트 | 통과 |
| 2 | 로그인 성공 / 실패 | 통과 (문구 지적) |
| 3 | 템플릿 업로드 · 미리보기 · 거부 | 통과 (문구 지적) |
| 4 | 캠페인 · 폼 생성, 링크 4개 | 통과 |
| 5 | 방문자 제출 · 쿠키 격리 | 제출 통과 / 쿠키 확인 보류 → **해결** |
| 6 | 채널 귀속 | 통과 |
| 7 | CRM 목록 · CSV | 통과 |
| 8 | API 문서 | 통과 (서버 항목 지적) |

## 지적 사항과 조치

### 1. 오류 메시지가 영문 — 수정 완료

로그인 실패가 `Invalid email or password`, 템플릿 거부가
`Only .html files are accepted` / `Template must contain a <form> element` 로
표시되었다. 한국어 운영자용 화면에 영문 문구가 노출되는 문제.

사용자에게 보이는 모든 `message` 를 한국어로 교체했다. 기계가 읽는 `code`
(`VALIDATION_ERROR` 등)는 영문 그대로 두어 API 소비자가 문구가 아닌 코드에
의존하도록 했다.

### 2. Swagger 서버 목록이 localhost 뿐 — 수정 완료

배포된 `/api-docs` 에서 "Try it out" 을 누르면 `http://localhost:3000` 으로
요청이 나가 동작하지 않았다. `doc/openapi.yaml` 의 `servers` 에 배포 도메인
두 개를 앞쪽에 추가했다.

### 3. 쿠키 목록 미확보 — 자동 테스트로 확인 완료

DevTools 쿠키 목록을 회수하지 못해 "공개 폼 도메인에 `leadmagnet_session`
쿠키가 없다" 는 핵심 보안 요구사항이 수동으로는 미확인 상태였다.

`npm run test:prod` 의 전체 여정 테스트가 실제 브라우저에서 방문자 컨텍스트의
쿠키를 열거하도록 보강했다. 배포본 실행 결과:

```
cookies on the forms origin: visitor_id (domain=glowup-forms.vercel.app)
```

`leadmagnet_session` 은 존재하지 않는다. 수동 확인에 의존하지 않도록 단언으로
고정되어 매 실행마다 재검증된다.

## 기록해 둘 관찰

- 제출 완료 문구는 `제출이 완료되었습니다. 감사합니다!` 로, 스크립트가 기대한
  문구에 인사말이 덧붙은 형태다. 불일치가 아니다.
- CSV는 UTF-8 BOM + CRLF로 확인되었고, 한글이 정상 디코딩되었다. 단 실제 엑셀로
  열어본 것이 아니라 바이트 수준에서 검증했다.
- 대시보드 합계(방문 5 / 방문자 5 / 제출 2 / 40.0%)는 기존 데모 데이터가 함께
  집계된 값이다. QA 캠페인 단독으로는 2 / 2 / 1 / 50.0% 로 정확했다.

# Codex Prompts: GQAI Study

- 작성일: 2026-09-03
- 목적: 각 개발 세션에서 한 Phase만 안전하게 실행하기 위한 복사·붙여넣기 프롬프트

## 사용 규칙

1. 항상 현재 Phase에 맞는 프롬프트 하나만 사용한다.
2. Codex가 먼저 `PROJECT_GUIDE.md`를 읽게 한다.
3. `PROJECT_GUIDE.md`의 `다음 실행 Phase`와 프롬프트가 다르면 구현을 중단한다.
4. 검증 실패가 있으면 다음 Phase로 넘어가지 않는다.
5. Phase가 끝나면 문서의 상태와 검증 결과를 갱신한다.
6. MVP 밖 기능이 필요해 보이면 구현하지 말고 제안만 기록한다.

## Phase 0 Prompt — Planning Lock Review

```text
이 프로젝트에서는 구현을 시작하지 말고 Phase 0 기획 검토만 진행해줘.

먼저 루트 PROJECT_GUIDE.md를 전부 읽어줘. 이어서 아래 문서를 모두 읽어줘.
- docs/planning/INTAKE_SUMMARY.md
- docs/planning/PRD.md
- docs/planning/MVP_SCOPE.md
- docs/planning/USER_FLOW.md
- docs/planning/DATA_MODEL.md
- docs/planning/PHASE_PLAN.md
- docs/planning/VALIDATION_HARNESS.md
- docs/planning/CODEX_PROMPTS.md

할 일:
1. 사용자 요구와 문서 사이의 충돌을 찾는다.
2. 모듈 원본/버전/배정 카드의 경계가 일관적인지 확인한다.
3. 그룹 배정이 학생별 개별 기록을 만드는지 확인한다.
4. 로그인, 파일, RLS, 제출 이력의 보안 위험을 확인한다.
5. MVP와 future slot 범위가 섞인 곳을 찾는다.
6. Phase 1을 막는 미확정 결정만 목록으로 만든다.

하지 말 것:
- 앱 코드, package.json, DB 마이그레이션을 만들지 않는다.
- 새로운 P0 기능을 임의로 추가하지 않는다.
- 알림, 일정, 결제, AI 기능을 구현 대상으로 바꾸지 않는다.

산출물:
- 충돌 및 누락 목록
- 수정이 필요한 기획 문서
- Phase 1 진입 가능/불가 판정과 근거

검증:
- PROJECT_GUIDE.md와 docs/planning의 Markdown 링크를 확인한다.
- PHASE_PLAN.md의 Phase 0 검증 명령만 실행한다.
```

## Phase 1 Prompt — Static UI & Information Architecture

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 1. Static UI & Information Architecture"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md
- docs/planning/MVP_SCOPE.md
- docs/planning/USER_FLOW.md
- docs/planning/PHASE_PLAN.md
- docs/planning/VALIDATION_HARNESS.md

이번 세션의 목표:
실제 DB와 인증 없이 mock data로 관리자와 학생의 전체 핵심 동선을 확인할 수 있는 반응형 Next.js UI를 만든다.

할 일:
1. Next.js App Router와 TypeScript 프로젝트를 초기화한다.
2. 관리자/학생 레이아웃과 공통 디자인 토큰을 만든다.
3. USER_FLOW.md의 P0 경로와 화면을 mock data로 구현한다.
4. 모듈 작성→배정, 학습→제출, 피드백→완료 동선을 연결한다.
5. 로딩, 빈 상태, 성공, 입력 오류, 서버 오류, 권한 없음 예시를 만든다.
6. 360px 모바일과 데스크톱 레이아웃을 확인한다.
7. 일정·결제·알림·AI는 숨김 또는 "준비 중"으로만 표시한다.

하지 말 것:
- Supabase 프로젝트, DB, Auth, Storage를 연결하지 않는다.
- 실제 계정·업로드·결제·알림·AI API를 만들지 않는다.
- Notion 전체 기능이나 실시간 에디터를 만들지 않는다.
- Phase 2 이후 로직을 미리 구현하지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- VALIDATION_HARNESS.md의 반응형·접근성 항목을 수동 확인

마무리:
- 실행 결과와 화면 경로를 보고한다.
- 남은 문제를 기록한다.
- 통과한 경우에만 PROJECT_GUIDE.md의 다음 Phase를 Phase 2로 갱신한다.
```

## Phase 2 Prompt — Data & Storage Foundation

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 2. Data & Storage Foundation"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/DATA_MODEL.md
- docs/planning/PRD.md
- docs/planning/MVP_SCOPE.md
- docs/planning/VALIDATION_HARNESS.md
- docs/planning/PHASE_PLAN.md

이번 세션의 목표:
GQAI Study의 P0 데이터를 재현 가능하고 안전하게 저장하는 Supabase 기반을 만든다.

할 일:
1. 환경변수 예제와 서버/브라우저 Supabase 경계를 만든다.
2. DATA_MODEL.md의 P0 테이블, 제약, 인덱스를 마이그레이션으로 작성한다.
3. 가상 관리자·학생·그룹·모듈·배정 상태 seed를 만든다.
4. 모든 보호 테이블에 RLS를 활성화한다.
5. 관리자/학생 본인/다른 학생 정책을 작성한다.
6. module-assets, submission-assets, feedback-assets를 private로 계획대로 구성한다.
7. Storage RLS와 짧은 만료 URL 발급 경계를 구현한다.
8. 생성된 DB 타입을 애플리케이션에서 사용하게 한다.
9. 학생 A가 학생 B 데이터를 읽지 못하는 DB 테스트를 작성한다.

하지 말 것:
- service role 키를 브라우저 코드에 넣지 않는다.
- RLS를 끈 상태를 완료로 간주하지 않는다.
- 실제 사용자 개인정보를 seed에 넣지 않는다.
- 아직 모듈 편집기나 전체 제출 UI를 연결하지 않는다.
- 알림, 일정, 결제, AI 도메인 테이블을 만들지 않는다.

검증:
- npx supabase db reset
- npx supabase test db
- npm run typecheck
- npm run test
- npm run build
- 세 버킷이 private인지 확인

마무리:
- 마이그레이션, RLS, Storage 정책 결과를 요약한다.
- 실패한 정책이 있으면 다음 Phase로 가지 않는다.
- 통과한 경우에만 다음 Phase를 Phase 3으로 갱신한다.
```

## Phase 3 Prompt — Core Vertical Slice

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 3. Core Vertical Slice"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md
- docs/planning/USER_FLOW.md
- docs/planning/DATA_MODEL.md
- docs/planning/PHASE_PLAN.md
- docs/planning/VALIDATION_HARNESS.md

이번 세션의 목표:
최소 기능으로 모듈 작성→발행→학생 1명 배정→학습→텍스트 제출→피드백→완료를 실제 DB에서 끝까지 연결한다.

할 일:
1. seed 관리자와 학생을 사용한다.
2. 제목·문단 기반 최소 모듈 초안과 version 1 발행을 구현한다.
3. 학생 한 명 직접 배정과 학생별 카드 생성을 구현한다.
4. 학생 카드 목록/상세, 첫 열람, 학습 시작, 수강 완료를 연결한다.
5. 텍스트 제출 revision 1을 저장한다.
6. 관리자 검토 목록, 텍스트 피드백, 최종 완료를 연결한다.
7. 상태 전이와 활동 이벤트를 원자적으로 기록한다.
8. 같은 요청의 중복 실행을 막는다.
9. 원본 수정이 기존 배정 버전을 바꾸지 않는 테스트를 작성한다.

하지 말 것:
- 그룹·복수 배정, 이미지/PDF 에디터, 파일 제출을 확장하지 않는다.
- 계정 생성 UI와 전체 그룹 관리를 미리 구현하지 않는다.
- 발행 버전이나 제출된 차수를 UPDATE하지 않는다.
- 다음 Phase 기능을 섞지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- VALIDATION_HARNESS.md에서 최소 세로 흐름에 해당하는 시나리오 수행

마무리:
- 한 카드의 DB 연결과 상태 이력을 보고한다.
- mock 저장이 남았으면 Phase를 완료하지 않는다.
- 통과한 경우에만 다음 Phase를 Phase 4로 갱신한다.
```

## Phase 4 Prompt — Auth, Accounts & Groups

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 4. Auth, Accounts & Groups"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md의 인증·학생·그룹 요구사항
- docs/planning/USER_FLOW.md의 계정·로그인·그룹 흐름
- docs/planning/DATA_MODEL.md의 profiles/groups/RLS
- docs/planning/VALIDATION_HARNESS.md
- docs/planning/PHASE_PLAN.md

이번 세션의 목표:
강사가 학생 아이디와 임시 비밀번호를 발급하고, 학생이 최초 변경 후 본인 데이터만 사용하는 실제 인증·권한·그룹 흐름을 완성한다.

할 일:
1. 아이디/비밀번호 로그인과 안전한 내부 Auth 식별자 변환을 서버에서 처리한다.
2. next 경로 검증, 로그아웃, 세션 갱신을 구현한다.
3. 최초 비밀번호 변경을 강제한다.
4. 관리자 전용 학생 생성, 재설정, 활성/비활성을 구현한다.
5. 비밀번호는 생성 직후 한 번만 표시하고 저장하지 않는다.
6. 그룹 생성·수정·보관과 구성원 추가·제거를 구현한다.
7. 관리자/학생 보호 경로와 모든 Server Action의 역할 검사를 적용한다.
8. 학생 A/B 교차 접근과 비활성 계정 테스트를 작성한다.
9. Auth/DB 부분 실패 보상 절차를 구현하고 기록한다.

하지 말 것:
- 공개 회원가입, 소셜 로그인, 이메일 복구를 만들지 않는다.
- service role을 클라이언트에 전달하지 않는다.
- UI에서 버튼을 숨기는 것만으로 권한 처리를 끝내지 않는다.
- 그룹 공동 결과물을 만들지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run test:e2e
- npm run build
- VALIDATION_HARNESS.md AUTH/ACC/GRP/RLS 시나리오

보안 검증 실패가 있으면 즉시 중단하고 다음 Phase로 가지 않는다.
통과한 경우에만 다음 Phase를 Phase 5로 갱신한다.
```

## Phase 5 Prompt — Module Editor & Assignment Expansion

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 5. Module Editor & Assignment Expansion"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md의 MOD/ASN 요구사항
- docs/planning/USER_FLOW.md의 모듈·그룹 배정 흐름
- docs/planning/DATA_MODEL.md의 템플릿·버전·자산·배정
- docs/planning/MVP_SCOPE.md
- docs/planning/VALIDATION_HARNESS.md

이번 세션의 목표:
사용자가 제공한 Notion 형태의 실습과제를 사이트에서 직접 작성하고, 고정 버전으로 개인·복수 학생·그룹에 배정할 수 있게 한다.

할 일:
1. P0 블록만 지원하는 제한된 모듈 편집기를 구현한다.
2. 학습 목표, 준비물, 제출 요구, 완료 기준을 구조화한다.
3. 이미지·PDF·일반 자료 업로드와 private 열람을 구현한다.
4. 저장 상태, 새로고침 복원, 안전한 렌더링, 학생 미리보기를 만든다.
5. 발행 검증, immutable version, 새 버전, 복제, 보관을 구현한다.
6. 한 명, 복수 학생, 그룹 배정을 구현한다.
7. 실행 시점 구성원 확인, 중복 경고, 공통/개인 안내를 적용한다.
8. 배정 트랜잭션과 idempotency를 테스트한다.

하지 말 것:
- Notion 동기화, 임의 HTML, 실시간 공동 편집, 다단 레이아웃을 만들지 않는다.
- 발행된 version을 직접 수정하지 않는다.
- 그룹 배정 결과를 한 개 공동 카드로 만들지 않는다.
- 알림과 마감일 동작을 구현하지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run test:e2e
- npm run build
- VALIDATION_HARNESS.md MOD/ASN/Storage 시나리오

통과한 경우에만 다음 Phase를 Phase 6으로 갱신한다.
```

## Phase 6 Prompt — Learning & Submission Expansion

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 6. Learning & Submission Expansion"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md의 LRN/SUB 요구사항
- docs/planning/USER_FLOW.md의 학생 학습·제출 흐름
- docs/planning/DATA_MODEL.md의 learner_assignments/submissions/items
- docs/planning/VALIDATION_HARNESS.md
- docs/planning/MVP_SCOPE.md

이번 세션의 목표:
학생이 모바일에서 학습 상태를 기록하고 텍스트·링크·이미지·일반 파일을 조합해 초안, 제출, 재제출할 수 있게 한다.

할 일:
1. 학생 대시보드 우선순위와 카드 상태를 실제 데이터에 연결한다.
2. 첫 열람, 학습 시작, 수강 완료, 학생 개인 메모를 구현한다.
3. 네 종류의 제출 항목과 순서 변경을 구현한다.
4. URL, 파일 크기, MIME, 안전한 파일명 검증을 구현한다.
5. 업로드 진행·실패·재시도와 초안 복원을 구현한다.
6. 제출 시 revision 번호를 고정하고 모든 항목을 잠근다.
7. 이전 제출을 보존하는 재제출을 구현한다.
8. 완료·취소·중단 카드의 제출을 차단한다.
9. 고아 파일 탐지/정리 경로를 마련한다.
10. 학생 A/B 파일 접근 테스트를 작성한다.

하지 말 것:
- 제출된 차수를 편집하거나 덮어쓰지 않는다.
- Storage 버킷을 public으로 만들지 않는다.
- 실행 파일을 브라우저에서 미리보기/실행하지 않는다.
- 피드백 대시보드 확장을 미리 구현하지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run test:e2e
- npm run build
- VALIDATION_HARNESS.md LRN/SUB/STO 시나리오
- 360px 모바일에서 혼합 제출 수행

통과한 경우에만 다음 Phase를 Phase 7로 갱신한다.
```

## Phase 7 Prompt — Feedback & Operations

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 7. Feedback & Operations"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/PRD.md의 FDB/OPS 요구사항
- docs/planning/USER_FLOW.md의 피드백·재제출 흐름
- docs/planning/DATA_MODEL.md의 feedback/activity 모델
- docs/planning/VALIDATION_HARNESS.md
- docs/planning/PHASE_PLAN.md

이번 세션의 목표:
관리자가 제출을 검토하고 학생별 일반 피드백, 재제출 요청, 최종 완료를 처리하며 학생이 이를 확인·답변하게 한다.

할 일:
1. 오래된 순과 필터를 지원하는 검토 대기함을 구현한다.
2. 카드, 수강 상태, 모든 제출 차수를 한 화면에서 확인하게 한다.
3. 텍스트와 첨부파일 피드백을 구현한다.
4. 일반 피드백, 재제출 요청, 최종 완료의 상태 전이를 구현한다.
5. 학생 읽음 시각과 student_reply를 구현한다.
6. 완료 취소와 감사 이벤트를 구현한다.
7. 관리자 대시보드 집계와 학생 상세 통합 이력을 연결한다.
8. 실제 목록 수와 집계가 같은지 테스트한다.

하지 말 것:
- 피드백 메시지의 임의 수정·삭제를 만들지 않는다.
- 학생에게 다른 학생의 검토 정보나 집계를 노출하지 않는다.
- AI가 피드백을 생성하게 하지 않는다.
- 이메일·카카오 알림을 발송하지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run test:e2e
- npm run build
- VALIDATION_HARNESS.md FDB 및 교차 권한 시나리오

통과한 경우에만 다음 Phase를 Phase 8로 갱신한다.
```

## Phase 8 Prompt — Future Slots, QA, Deployment & Operations

```text
PROJECT_GUIDE.md를 먼저 전부 읽고 "다음 실행 Phase"가
"Phase 8. Future Slots, QA, Deployment & Operations"인지 확인해줘.
다르면 구현하지 말고 현재 Phase를 보고해줘.

상세 문서:
- docs/planning/MVP_SCOPE.md
- docs/planning/PRD.md
- docs/planning/USER_FLOW.md
- docs/planning/DATA_MODEL.md
- docs/planning/PHASE_PLAN.md
- docs/planning/VALIDATION_HARNESS.md

이번 세션의 목표:
MVP 전체를 검증하고, 미래 기능을 비활성 슬롯으로만 고정한 뒤, Vercel과 Supabase 운영 환경에 안전하게 배포한다.

할 일:
1. notifications, schedule, payments, ai_feedback flag가 모두 false인지 확인한다.
2. 미래 기능은 숨김/준비 중 UI와 문서화된 이벤트 경계만 남긴다.
3. 전체 자동 테스트, RLS, Storage, 역할별 E2E를 실행한다.
4. 360/390/768/1440 뷰포트와 키보드 접근성을 확인한다.
5. 로그와 빌드 산출물에 비밀값·제출 본문·서명 URL이 없는지 확인한다.
6. Preview 환경에서 전체 운영 시나리오를 완료한다.
7. Vercel Production 환경변수와 Supabase 운영 마이그레이션을 적용한다.
8. 운영 관리자와 테스트 학생으로 smoke test를 수행한다.
9. 백업·복구·롤백 절차와 릴리스 노트를 작성한다.

하지 말 것:
- 결제 SDK, 메시지 발송, 캘린더 CRUD, 모델 API를 추가하지 않는다.
- 테스트를 끄거나 RLS를 완화해 출시 조건을 맞추지 않는다.
- 실제 사용자 데이터로 위험한 배포 검증을 하지 않는다.
- 치명적/높은 우선순위 이슈가 있는데 출시 완료로 표시하지 않는다.

검증:
- npm run lint
- npm run typecheck
- npm run test
- npm run test:e2e
- npm run build
- npx supabase test db
- VALIDATION_HARNESS.md의 Production smoke test와 출시 차단 기준 전체

마무리:
- 운영 URL, 실행한 검증, 결과, 알려진 문제, 롤백 방법을 보고한다.
- 모든 출시 차단 항목이 해소된 경우에만 PROJECT_GUIDE.md를 MVP Released로 갱신한다.
```

## 긴급 보안 점검 Prompt

보안 또는 데이터 누출 의심 시 Phase와 무관하게 진단용으로만 사용한다.

```text
PROJECT_GUIDE.md와 docs/planning/VALIDATION_HARNESS.md의 출시 차단 기준을 먼저 읽어줘.
현재 요청은 진단이다. 기능을 추가하거나 RLS를 완화하지 마.

다음을 확인해줘:
1. 영향을 받는 사용자, 테이블, 파일 버킷, 경로
2. 미로그인/학생 A/학생 B/관리자별 재현 결과
3. service role 또는 서명 URL 노출 여부
4. 최근 마이그레이션과 권한 변경
5. 데이터가 실제로 노출됐는지와 노출 가능성만 있는지

결과:
- 심각도
- 재현 단계
- 근본 원인
- 즉시 차단 방법
- 안전한 수정 계획
- 필요한 회귀 테스트

진단이 끝날 때까지 새 배포나 기능 구현을 하지 마.
```

# Project Guide: GQAI Study

- 문서 상태: `MVP 구현 완료·운영 인수인계본`
- 프로젝트 등급: `Level 3. Full Project`
- 작성일: 2026-09-03
- 프로젝트 루트: `/Users/ykpark/2609-GQAI-STUDY`
- 구현 상태: 전체 MVP 코드와 로컬 Supabase 연동 검증 완료, 원격 운영 배포는 사용자 환경변수 입력 대기

이 문서는 모든 개발·운영 세션의 진입점이다. 변경 전 이 문서와 관련 상세 문서를 읽고, 현재 구현과 [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md)의 검증 기준을 함께 유지한다.

## 1. 프로젝트 정의

강사가 직접 만든 실습 모듈을 학생 개인 또는 그룹에 배정하고, 학생이 학습 상태와 결과물을 기록하며, 강사가 학생별 피드백과 재제출 과정을 관리하는 초대 전용 프라이빗 과외 학습관리 서비스다.

작업명은 `GQAI Study`로 사용한다. 정식 서비스명과 도메인은 구현 전 변경할 수 있다.

## 2. 사용 주체

### 강사/관리자

- 학생 계정을 직접 발급하고 관리한다.
- 학생을 그룹으로 묶어 운영한다.
- 재사용 가능한 실습 모듈을 사이트 안에서 직접 작성한다.
- 모듈을 개인 또는 그룹에 배정한다.
- 학생별 학습, 제출, 피드백, 재제출 상태를 확인한다.

### 학습자

- 강사가 준 아이디와 임시 비밀번호로 로그인한다.
- 자신에게 배정된 카드만 확인한다.
- 학습 시작 및 수강 완료를 직접 기록한다.
- 텍스트, 링크, 이미지, 일반 파일을 제출한다.
- 강사의 피드백을 확인하고 필요하면 재제출한다.

MVP는 한 명의 강사/관리자가 운영하는 단일 조직을 전제로 한다. 다중 강사 조직과 강사별 데이터 분리는 범위 밖이다.

## 3. 반드시 지켜야 하는 도메인 규칙

1. `모듈 원본`과 `학생에게 배정된 카드`는 서로 다른 데이터다.
2. 배정 시 사용한 모듈 버전은 고정한다. 원본 수정이 과거 배정을 바꾸면 안 된다.
3. 그룹은 관리와 일괄 배정을 위한 묶음일 뿐이다.
4. 그룹에 배정할 때 구성원마다 `learner_assignment`를 하나씩 생성한다.
5. 진도, 제출물, 피드백, 완료 여부는 언제나 학생 개인 단위다.
6. 그룹 배정 후 새로 들어온 학생에게 과거 카드가 자동 생성되지 않는다.
7. 학생의 자유 회원가입은 없다. 관리자만 계정을 생성·비활성화·비밀번호 재설정할 수 있다.
8. 비밀번호 원문을 애플리케이션 데이터베이스나 로그에 저장하지 않는다.
9. 학생은 다른 학생의 프로필, 배정, 제출물, 피드백을 볼 수 없다.
10. 제출 및 피드백 기록은 물리 삭제보다 보존과 보관을 우선한다.
11. 알림, 일정, 결제, AI 피드백은 MVP에서 동작하지 않는다. 명시된 확장 지점만 둔다.
12. 자동 Notion 동기화는 하지 않는다. 초기 강의 11개는 2026-08-31 기준 Notion 원문을 앱 데이터로 변환해 제공하며, 이후 모듈은 서비스 안에서 직접 작성한다.

## 4. MVP가 증명해야 하는 것

> 강사가 모듈을 한 번 작성해 개인 또는 그룹에 배정하고, 각 학생이 결과물을 제출한 뒤, 강사가 학생별로 피드백하고 완료 처리할 수 있다.

MVP의 세 가지 필수 흐름:

1. 강사: 모듈 작성·발행 → 학생/그룹 선택 → 배정
2. 학생: 배정 카드 열람 → 학습 상태 기록 → 결과물 제출
3. 강사와 학생: 피드백 → 수정/재제출 → 최종 완료

세부 포함·제외 범위는 [MVP_SCOPE.md](docs/planning/MVP_SCOPE.md)를 단일 기준으로 삼는다.

## 5. 구현된 기술 경계

| 영역            | 계획                                                    |
| --------------- | ------------------------------------------------------- |
| 웹 애플리케이션 | Next.js 16 App Router, React 19, TypeScript             |
| UI              | Tailwind CSS 4, shadcn/ui·Base UI, 반응형 공통 컴포넌트 |
| 데이터베이스    | Supabase Postgres                                       |
| 인증            | Supabase Auth 기반 강사 발급 계정                       |
| 파일            | 비공개 Supabase Storage 버킷과 짧은 만료의 접근 URL     |
| 권한            | 서버 측 역할 검사 + Postgres RLS의 이중 방어            |
| 테스트          | Vitest, Playwright 데스크톱·모바일                      |
| 배포            | Vercel 연결 준비 완료                                   |

보안 판단은 UI에서 버튼을 숨기는 것으로 끝내지 않는다. Next.js의 공식 인증 가이드가 권장하듯 데이터 접근 계층과 각 서버 작업 가까이에서 권한을 확인한다.

관련 공식 문서:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Supabase Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Private Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

## 6. 계정 구현 원칙

- 로그인 화면에는 `아이디`와 `비밀번호`만 노출한다.
- `login_id`는 소문자 영문, 숫자, 점, 밑줄, 하이픈을 허용하는 고유값으로 정규화한다.
- Supabase Auth 내부 식별자는 사용자에게 보이지 않게 서버에서 변환한다.
- 계정 생성과 비밀번호 초기화는 관리자 권한을 확인한 서버 코드에서만 실행한다.
- `service_role` 키는 서버 환경변수에만 두고 클라이언트 번들에 포함하지 않는다.
- 최초 로그인 사용자는 `/change-password` 이외의 보호 화면을 사용할 수 없다.
- 관리자는 기존 비밀번호를 조회할 수 없고 임시 비밀번호로 재설정만 할 수 있다.
- 로그인 실패 메시지는 아이디 존재 여부를 노출하지 않는다.

## 7. 구현·유지보수 원칙

- 변경은 `PHASE_PLAN.md`의 제품 경계와 `VALIDATION_HARNESS.md`의 검증 계약을 유지한다.
- 핵심 흐름을 바꾸면 도메인 테스트, 데모 E2E, 실제 Supabase E2E 중 영향받는 검증을 함께 갱신한다.
- MVP 범위 밖 요구가 나오면 먼저 `MVP_SCOPE.md`에 기록하고 우선순위를 결정한다.
- 화면은 모바일 폭 360px부터 데스크톱까지 핵심 행동이 가능해야 한다.
- 로딩, 빈 상태, 성공, 입력 오류, 권한 없음, 서버 오류를 기능의 일부로 구현한다.
- 사용자에게 내부 오류 메시지, SQL, 스택 트레이스, 스토리지 경로를 보여주지 않는다.
- 날짜는 DB에 UTC로 저장하고 화면에는 `Asia/Seoul` 기준으로 표시한다.
- 파일은 비공개로 저장한다. 권한 확인 없는 영구 공개 URL을 만들지 않는다.
- 위험한 관리자 작업에는 대상 이름과 결과를 보여주는 확인 절차가 필요하다.
- 계정과 기록은 기본적으로 비활성화/보관하며 즉시 물리 삭제하지 않는다.
- 개발 도중 생긴 범위 결정과 예외는 관련 기획 문서에 함께 반영한다.

## 8. 계획 문서 지도

| 문서                                                         | 용도                                      |
| ------------------------------------------------------------ | ----------------------------------------- |
| [INTAKE_SUMMARY.md](docs/planning/INTAKE_SUMMARY.md)         | 사용자 답변, 확정 결정, 가정, 남은 결정   |
| [PRD.md](docs/planning/PRD.md)                               | 제품 목표, 기능 요구사항, 권한, 수용 기준 |
| [MVP_SCOPE.md](docs/planning/MVP_SCOPE.md)                   | 반드시 만들 것과 만들지 않을 것           |
| [USER_FLOW.md](docs/planning/USER_FLOW.md)                   | 역할별 경로, 상태, 예외 흐름              |
| [DATA_MODEL.md](docs/planning/DATA_MODEL.md)                 | 테이블, 관계, 상태, RLS, 파일 정책        |
| [PHASE_PLAN.md](docs/planning/PHASE_PLAN.md)                 | 구현 순서, 산출물, 다음 단계 진입 조건    |
| [VALIDATION_HARNESS.md](docs/planning/VALIDATION_HARNESS.md) | 자동·수동 검증과 릴리스 차단 기준         |
| [CODEX_PROMPTS.md](docs/planning/CODEX_PROMPTS.md)           | Phase별 독립 실행 프롬프트                |

문서 충돌 시 우선순위는 다음과 같다.

1. 사용자의 가장 최근 명시적 결정
2. `MVP_SCOPE.md`
3. `PRD.md`
4. `DATA_MODEL.md`와 `USER_FLOW.md`
5. `PHASE_PLAN.md`

## 9. 현재 Phase 상태

| 항목                              | 상태                         |
| --------------------------------- | ---------------------------- |
| Phase 0 기획 문서                 | 완료                         |
| Phase 1 정적 UI·IA                | 완료                         |
| Phase 2 데이터·Storage 기반       | 완료                         |
| Phase 3 핵심 세로 흐름            | 완료, 실제 Supabase E2E 통과 |
| Phase 4 인증·계정·그룹            | 완료                         |
| Phase 5 모듈·배정                 | 완료                         |
| Phase 6 학습·제출                 | 완료                         |
| Phase 7 피드백·운영               | 완료                         |
| Phase 8 미래 기능 위치·로컬 QA    | 완료                         |
| Phase 8 원격 Supabase·Vercel 배포 | 사용자 환경변수 입력 대기    |
| 구현 차단 사항                    | 없음                         |
| 알려진 치명적/높은 우선순위 이슈  | 0                            |

운영 연결은 [ENV_SETUP.md](ENV_SETUP.md)의 체크리스트를 위에서 아래로 실행한다. 로컬 검증의 실제 결과는 [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md)에 기록했다.

## 10. 공통 완료 정의

모든 구현 Phase는 다음 조건을 만족해야 완료로 표시한다.

- 해당 Phase 산출물이 모두 존재한다.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` 중 프로젝트에 정의된 검증이 통과한다.
- 관련 핵심 경로를 데스크톱과 모바일에서 확인한다.
- 보호 경로와 서버 작업에 역할 검사가 적용되어 있다.
- 오류·빈 상태·로딩 상태가 확인되었다.
- 테스트 데이터에 다른 학생의 데이터 누출이 없다.
- 알려진 문제와 다음 Phase 진입 조건이 기록되어 있다.
- `PROJECT_GUIDE.md`의 Phase 상태가 갱신되었다.

## 11. 유지보수 세션 시작 프롬프트

```text
PROJECT_GUIDE.md와 VERIFICATION_REPORT.md를 먼저 읽어줘.
요청 변경이 MVP 범위와 데이터·권한 규칙에 미치는 영향을 확인한 뒤 구현해줘.
관련 자동 테스트와 데스크톱·모바일 핵심 흐름을 검증하고, 문서와 검증 보고서를 함께 갱신해줘.
```

## 12. 변경 기록

| 날짜       | 변경                                                  | 상태           |
| ---------- | ----------------------------------------------------- | -------------- |
| 2026-09-03 | 최초 상세 기획 문서 세트 작성                         | 검토 대기      |
| 2026-09-03 | 전체 MVP, 데모 모드, Supabase 운영 모드 구현          | 완료           |
| 2026-09-03 | DB/RLS/Storage 17개 검증, 4종 제출·첨부·시각 E2E 완료 | 통과           |
| 2026-09-03 | 환경변수·원격 배포를 사용자 일괄 실행 문서로 분리     | 대기 항목 명시 |

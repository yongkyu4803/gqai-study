# GQAI Study

강사가 직접 만든 실습 모듈을 학생 개인 또는 그룹에 배정하고, 학생별 학습·제출·피드백·재제출·완료 이력을 관리하는 초대 전용 과외 학습관리 서비스입니다.

애플리케이션은 두 모드로 실행됩니다.

- `demo`: 외부 서비스 없이 브라우저 `localStorage`에 저장되는 완성형 데모
- `supabase`: Supabase Auth, Postgres, RLS, private Storage를 사용하는 운영 모드

## 현재 상태

- MVP 기능 구현 완료
- 데스크톱·모바일 데모 E2E 통과
- 실제 로컬 Supabase Auth/API/DB/Storage E2E 통과
- RLS, 학생 간 격리, 개인 메모 격리, 버전 불변성 검증 통과
- 운영 Supabase와 Vercel 연결만 사용자 환경변수 입력 후 진행

자세한 결과는 [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md), 한 번에 실행할 운영 설정은 [ENV_SETUP.md](ENV_SETUP.md)를 확인하세요.

## 주요 기능

### 강사

- 학생 아이디·임시 비밀번호 발급, 비밀번호 재설정, 계정 활성/비활성
- 학생 그룹 생성과 구성원 관리
- 빠른 추가·유형 전환·중간 삽입·복제·키보드 단축키를 지원하는 블록 편집기로 실습 모듈 작성
- Notion `AI 공부방`을 기준으로 구성한 발행 강의 11개와 화면 자료 23개 기본 제공
- 문단, 제목, 목록, 체크리스트, 인용, 구분선, 코드, 링크, 이미지, PDF, 첨부파일 블록 지원
- 초안 저장, 미리보기, 불변 버전 발행, 복제, 보관
- 학생 개인 또는 그룹 일괄 배정
- 학생별 안내 수정, 활동 전 카드 취소, 활동 후 중단
- 전체 진행 현황과 제출 검토 대기함
- 일반 피드백, 재제출 요청, 첨부, 최종 완료와 완료 취소

### 학생

- 강사가 발급한 아이디·비밀번호 로그인
- 최초 로그인 시 비밀번호 변경
- 본인에게 배정된 카드만 조회
- 학습 시작·수강 완료 기록과 본인 전용 메모
- 텍스트, 링크, 이미지, 일반 파일 혼합 제출
- 제출 차수 이력, 피드백 확인, 답변, 재제출

### 향후 기능 자리

알림, 일정, 결제, AI 피드백은 기능 위치와 비활성 feature flag만 준비되어 있으며 외부 API를 호출하지 않습니다.

## 기술 구성

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4, shadcn/ui + Base UI
- Supabase Auth, Postgres, Row Level Security, private Storage
- Vitest, Playwright
- Vercel 배포 준비

## 빠른 데모 실행

요구사항: Node.js 20.9 이상, npm

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 기본 `.env.local`은 `NEXT_PUBLIC_APP_MODE=demo`입니다.

### 데모 계정

| 역할 | 아이디   | 비밀번호      | 비고                    |
| ---- | -------- | ------------- | ----------------------- |
| 강사 | `admin`  | `admin1234`   | 관리자 전체 기능        |
| 학생 | `minji`  | `student1234` | 피드백·재제출 샘플      |
| 학생 | `junho`  | `student1234` | 일반 학습 샘플          |
| 학생 | `suyeon` | `student1234` | 최초 비밀번호 변경 샘플 |

데모 데이터는 설정 화면의 초기화 기능 또는 브라우저 사이트 데이터 삭제로 되돌릴 수 있습니다.

## 명령어

```bash
npm run dev              # 개발 서버
npm run lint             # ESLint
npm run typecheck        # TypeScript
npm run test             # 도메인 단위 테스트
npm run test:coverage    # 커버리지
npm run test:e2e         # 기본 데모 E2E; Supabase 전용 테스트는 자동 skip
npm run build            # 프로덕션 빌드
npm run verify           # lint + typecheck + unit + 문서 링크 + build
npm run verify:supabase  # 쓰기 허용된 전용 Supabase 환경의 데이터/RLS 검증
npm run setup:admin      # 최초 관리자 계정 1회 생성
npm run setup:modules    # 노션 원문 기반 강의 11개를 운영 DB에 등록·갱신
```

로컬 Supabase의 전체 검증 명령과 필요한 환경변수는 [ENV_SETUP.md](ENV_SETUP.md)에 분리했습니다. `verify:supabase`와 Supabase E2E는 테스트 데이터를 생성하므로 운영 DB에서 실행하지 마세요.

## 핵심 구조

```text
src/app/                 화면과 관리자 계정 API
src/components/          역할별 화면, 레이아웃, 공통 UI
src/lib/domain/          타입, 상태 전이, 입력 검증
src/lib/demo/            데모 fixture
content/                 노션 원문 기반 강의 seed와 화면 자료
src/lib/supabase/        클라이언트·서버·저장소·권한 경계
supabase/migrations/     재현 가능한 DB/RLS/Storage 마이그레이션
scripts/                 관리자 bootstrap, Supabase 검증기
e2e/                     데모·실제 Supabase·시각 E2E
docs/planning/           PRD, 흐름, 데이터 모델, 단계 계획
docs/verification/       확인한 데스크톱·모바일 화면 캡처
```

## 보안 원칙

- 자유 회원가입 UI가 없으며 운영 Supabase에서도 신규 가입을 비활성화합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 `server-only` 관리자 모듈과 Route Handler에서만 사용합니다.
- 학생은 RLS로 본인 배정·제출·피드백만 조회합니다.
- 학생 개인 메모는 별도 `student_notes` 테이블에 저장되어 강사도 읽을 수 없습니다.
- 모든 버킷은 private이며 5분 서명 URL을 사용합니다.
- 노션 강의 화면 자료도 운영 등록 시 private `module-assets` 버킷으로 옮깁니다.
- 실행 파일 확장자는 브라우저 검증과 Storage RLS 양쪽에서 차단합니다.
- 발행된 모듈 버전은 DB 트리거로 UPDATE/DELETE를 거부합니다.

## 문서

- [PROJECT_GUIDE.md](PROJECT_GUIDE.md): 제품 규칙과 구현 현황
- [ENV_SETUP.md](ENV_SETUP.md): 환경변수, Supabase, Vercel 일괄 설정
- [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md): 최종 검증 증거와 남은 외부 작업
- [docs/planning/PRD.md](docs/planning/PRD.md): 상세 제품 요구사항
- [docs/planning/USER_FLOW.md](docs/planning/USER_FLOW.md): 역할별 사용자 흐름
- [docs/planning/DATA_MODEL.md](docs/planning/DATA_MODEL.md): 데이터·RLS·Storage 설계
- [docs/planning/VALIDATION_HARNESS.md](docs/planning/VALIDATION_HARNESS.md): 검증 기준

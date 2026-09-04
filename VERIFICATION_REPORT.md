# 최종 검증 보고서

- 프로젝트: GQAI Study
- 검증일: 2026-09-03 (Asia/Seoul)
- 검증 환경: macOS, Node.js, Next.js 16.3.4, 로컬 Supabase/Docker, Chromium
- 결과: **로컬 출시 기준 통과**
- 운영 배포 상태: 사용자 Supabase/Vercel 환경변수 입력 전이므로 원격 배포 검증만 대기

## 1. 검증한 핵심 사용자 이야기

> 강사가 학생 계정을 발급하고 실습 모듈을 작성·발행해 개인 또는 그룹에 배정하면, 학생이 최초 비밀번호를 변경하고 학습 상태와 결과물을 기록하며, 강사가 학생별 피드백·재제출·최종 완료를 처리할 수 있다.

## 2. 자동 검증 결과

| 영역                    | 명령/방법                                                           | 결과                             |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------- |
| ESLint                  | `npm run lint`                                                      | PASS, 오류 0                     |
| TypeScript              | `npm run typecheck`                                                 | PASS, 오류 0                     |
| 도메인 단위 테스트      | `npm run test`                                                      | PASS, 8/8                        |
| 문서 로컬 링크          | `npm run check:docs`                                                | PASS, 깨진 링크 0                |
| 프로덕션 빌드           | `npm run build`                                                     | PASS, 26개 App Router 경로 생성  |
| 패키지 취약점           | `npm audit --audit-level=high`                                      | PASS, 취약점 0                   |
| 비밀값 정적 검색        | Supabase secret/JWT 패턴 검색                                       | PASS, 소스 아티팩트 노출 0       |
| DB 재현                 | `npx supabase db reset --local`                                     | PASS, 빈 DB부터 migration 재적용 |
| DB 정적 검사            | `npx supabase db lint --local`                                      | PASS, schema error 0             |
| 데모 핵심 E2E           | `npx playwright test e2e/core-flow.spec.ts`                         | PASS, 데스크톱·모바일 6/6        |
| 실제 Supabase E2E       | `RUN_SUPABASE_E2E=true … playwright test e2e/supabase-flow.spec.ts` | PASS, 데스크톱·모바일 2/2        |
| 시각·콘솔 검증          | 프로덕션 빌드에서 `e2e/visual.spec.ts`                              | PASS, 4/4·console error 0        |
| 데이터/RLS/Storage 검증 | `SUPABASE_VERIFY_ALLOW_WRITE=true npm run verify:supabase`          | PASS, 17/17                      |

### 노션 강의 콘텐츠 반영

- 기준 원문: AI 공부방, 마지막 수정 2026-08-31 12:07 UTC
- 발행 모듈: 11개 — AI와 친해지기, 툴과 친해지기, 업무 해체하기, HTML+CSS로 웹페이지 만들기, 자동화 기본기, 첫 배포, 음악 만들어보기, 스킬 익히기, 스킬 공유하기, 데이터베이스 입문, 웹크롤링
- 본문 블록: 122개
- 앱에 보존한 노션 화면 자료: PNG 23개
- 노션이 다운로드 주소를 제공하지 않은 참고 PPT 1개는 원문 첨부 링크로 연결
- 데모와 운영 DB가 동일한 `content/notion-modules.json`을 사용하며, 운영에서는 `npm run setup:modules`로 중복 없이 등록·갱신하고 이미지 23개를 private Storage에 업로드

## 3. 실제 Supabase E2E 범위

브라우저가 실제 Supabase Auth, 관리자 Route Handler, Postgres RPC, RLS, Storage를 거쳐 다음 흐름을 완주했습니다.

1. 관리자 로그인
2. 학생 아이디와 임시 비밀번호 발급
3. 실습 모듈 작성, PDF 업로드, 버전 발행
4. 학생 개인에게 카드 배정
5. 학생별 안내 수정과 학생 화면 반영
6. 학생 최초 로그인과 비밀번호 변경
7. 학습 시작과 수강 완료 기록
8. 텍스트·링크·이미지·일반 파일 혼합 결과물 제출과 이미지 미리보기
9. 관리자 검토 대기함 확인
10. 파일 첨부 피드백과 최종 완료
11. 완료 취소 후 재완료

동일 시나리오를 Desktop Chrome과 iPhone 13 크기의 Chromium에서 각각 실행했습니다.

## 4. 데이터·권한 검증 17개

모든 항목이 실제 로컬 Supabase에서 통과했습니다.

1. 관리자 발급 계정과 학생 4명 생성
2. 그룹 생성과 구성원 3명 저장
3. 위험한 모듈 URL 차단과 version 1 발행
4. 그룹 배정이 정확히 3개의 학생별 카드로 분해
5. 학생 A가 학생 B의 카드와 프로필을 조회하지 못함
6. 배정 후 학생별 안내 수정
7. 활동 전 취소와 활동 후 중단을 구분
8. 학생 개인 메모를 관리자도 조회하지 못함
9. 학습 시작, 위험한 제출 URL 차단, 텍스트+링크+이미지+파일 혼합 제출
10. 학생 B가 학생 A의 private 파일을 다운로드하지 못함
11. 실행 파일 확장자를 Storage RLS에서 차단
12. 강사 재제출 요청과 해당 학생 조회
13. 재제출 시 1차·2차 제출을 모두 보존
14. 강사 최종 완료와 완료 시각 기록
15. 관리자 완료 취소와 감사 이력
16. 그룹 신규 구성원에게 과거 카드가 자동 생성되지 않음
17. 새 버전 발행 후에도 과거 카드가 기존 버전을 유지하며 발행 버전 변조가 거부됨

## 5. 시각 검증 결과

프로덕션 빌드 화면을 직접 열어 데스크톱과 모바일에서 확인했습니다. 가로 넘침, 핵심 버튼 가림, 깨진 내비게이션, 브라우저 콘솔 오류는 발견되지 않았습니다.

| 역할   | 데스크톱                                                          | 모바일                                                                 |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 관리자 | [관리자 대시보드](docs/verification/admin-dashboard-chromium.png) | [관리자 대시보드 모바일](docs/verification/admin-dashboard-mobile.png) |
| 학생   | [학생 학습 화면](docs/verification/student-learning-chromium.png) | [학생 학습 화면 모바일](docs/verification/student-learning-mobile.png) |
| 편집기 | [모듈 편집 작업대](docs/verification/module-editor-chromium.png)  | [모듈 편집 모바일](docs/verification/module-editor-mobile.png)         |

## 6. 확인한 보안 경계

- 공개 회원가입 경로 없음
- 관리자 계정 API마다 서버에서 세션·활성 상태·admin 역할 검사
- `SUPABASE_SERVICE_ROLE_KEY`를 `server-only` 모듈에서만 생성
- Proxy의 미로그인 보호와 데이터 계층 RLS 이중 방어
- 학생별 배정·제출·피드백 격리
- 관리자도 볼 수 없는 학생 개인 메모 테이블
- 세 Storage 버킷 모두 private
- 50MB 상한, 안전한 파일명, 실행 파일 이중 차단
- 모듈 파일 메타데이터와 Storage 객체 연결
- 발행 버전 DB 불변 트리거
- 그룹 배정 RPC의 단일 트랜잭션과 idempotency key
- 비밀번호 원문을 서비스 테이블이나 로그에 저장하지 않음
- 보안 응답 헤더: nosniff, frame deny, referrer policy, permissions policy
- 모듈·제출 링크는 `http/https`만 허용하고 파일 URL은 새로 발급한 서명 URL, 데모 `blob:`, 검증된 데모 전용 이미지 API 경로만 렌더링

## 7. 검증 중 발견하고 해결한 항목

- 폼 내부 공통 버튼의 기본 타입 때문에 제출이 실행되지 않던 문제를 명시적 `type="submit"`으로 수정
- Base UI 링크 렌더링 시 native button 경고를 공통 버튼 컴포넌트에서 제거
- 학생 메모를 배정 테이블에서 분리해 관리자 조회 가능성을 구조적으로 제거
- 클라이언트 파일 검증 우회를 막기 위해 실행 파일 차단을 Storage RLS에도 추가
- 모듈 파일 업로드 후 `module_assets` 메타데이터가 없던 경로에 보상 삭제를 포함한 저장 로직 추가
- 학생별 안내 수정, 활동 전 취소·활동 후 중단, 완료 취소를 DB RPC와 화면에 연결
- 실제 Supabase E2E의 고유 fixture와 모바일 로그아웃 동작 보강
- 같은 관리자 계정의 전역 로그아웃 경합을 막기 위해 실제 Supabase 프로젝트별 시나리오를 순차 실행
- 개발 도구가 없는 프로덕션 빌드에서 최종 화면을 다시 캡처
- 모듈·제출 URL을 UI, 도메인, DB 발행 함수, 렌더러에서 중복 검증
- 이미지 블록과 이미지 제출물에 대체 텍스트가 있는 반응형 미리보기 추가
- 실제 Supabase E2E에 네 가지 혼합 제출과 피드백 파일 첨부를 포함
- 모듈 본문 편집기에 빠른 추가, 유형 전환, 중간 삽입, 복제, 키보드 이동·저장, 변경 상태 표시를 추가
- 모바일에서는 긴 기본 정보보다 본문 편집기를 먼저 배치하고 데스크톱·모바일 상호작용을 재검증
- Notion의 만료형 이미지 주소 23개를 앱 내부 원본 자산으로 보존하고, 운영에서는 private Storage로 옮기도록 구성
- 기존 브라우저의 오래된 데모 fixture가 새 강의를 가리지 않도록 데모 저장소 버전을 갱신

## 8. 남은 외부 작업

코드나 로컬 검증의 미완료 항목은 없습니다. 아래 작업은 사용자가 실제 계정과 비밀값을 제공해야 하므로 의도적으로 실행하지 않았습니다.

- 운영 Supabase 프로젝트 생성과 Auth 가입 차단 설정
- 원격 DB migration push
- 운영 관리자 1회 bootstrap
- 노션 강의 모듈 11개 운영 DB bootstrap
- Vercel Preview/Production 환경변수 등록과 배포
- 실제 도메인에서 최종 smoke test
- 운영 백업·복구 정책 선택

실행 순서와 복사 가능한 환경변수 목록은 [ENV_SETUP.md](ENV_SETUP.md)에 있습니다. 운영 배포가 끝나면 이 보고서의 상태를 `운영 출시 기준 통과`로 갱신하고 실제 URL smoke test 결과를 추가하면 됩니다.

## 9. 최종 판정

- 치명적 이슈: 0
- 높은 우선순위 이슈: 0
- 로컬 MVP 기능: 완료
- 실제 Supabase 연동: 완료 및 검증
- 데스크톱·모바일 핵심 흐름: 완료 및 검증
- 원격 운영 배포: 환경변수 입력 대기

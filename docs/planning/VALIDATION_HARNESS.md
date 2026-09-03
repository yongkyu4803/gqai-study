# Validation Harness: GQAI Study

- 작성일: 2026-09-03
- 목적: 구현의 “완료”를 화면 인상 대신 반복 가능한 증거로 판단한다.
- 적용 범위: 로컬, Preview, Production

## 현재 실행 상태 (2026-09-03)

로컬 코드·DB·브라우저 검증은 완료되었으며 실제 결과는 [VERIFICATION_REPORT.md](../../VERIFICATION_REPORT.md)에 기록했다. 운영 URL이 필요한 Preview/Production smoke test만 [ENV_SETUP.md](../../ENV_SETUP.md)의 사용자 환경 설정 이후 실행한다.

## 1. 통과 원칙

1. 각 Phase는 자동 검증과 수동 브라우저 확인을 모두 통과해야 한다.
2. 실패한 검증을 주석 처리하거나 테스트를 삭제해 통과시키지 않는다.
3. 보안, 데이터 격리, 이력 불변성 실패는 출시 차단이다.
4. 테스트 계정과 데이터는 실제 개인정보를 사용하지 않는다.
5. 운영 검증에서 생성한 테스트 기록은 별도 표식 후 보관 또는 안전하게 정리한다.
6. 실행한 명령, 날짜, 결과, 실패 원인을 Phase 종료 기록에 남긴다.

## 2. 기본 명령 계약

구현 시 `package.json`에 다음 명령을 정의한다.

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Supabase 로컬 개발을 선택하면 다음을 재현 가능하게 유지한다.

```bash
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
SUPABASE_VERIFY_ALLOW_WRITE=true npm run verify:supabase
```

명령이 달라지면 이 문서를 먼저 갱신한다.

브라우저 검증 모드:

```bash
# 외부 서비스 없는 데모 흐름
npx playwright test e2e/core-flow.spec.ts

# 쓰기 가능한 로컬/전용 Supabase 프로젝트만
RUN_SUPABASE_E2E=true npx playwright test e2e/supabase-flow.spec.ts

# 프로덕션 빌드 화면과 console error
npm run build
CAPTURE_VISUALS=true PLAYWRIGHT_USE_BUILD=true npx playwright test e2e/visual.spec.ts
```

## 3. 테스트 계정과 고정 fixture

| 식별                  | 역할/상태                | 목적                  |
| --------------------- | ------------------------ | --------------------- |
| `admin_fixture`       | 활성 관리자              | 전체 운영 기능        |
| `student_a`           | 활성, 비밀번호 변경 완료 | 본인 데이터 정상 흐름 |
| `student_b`           | 활성, 비밀번호 변경 완료 | 교차 접근 차단        |
| `student_first_login` | 활성, 최초 변경 필요     | 강제 변경 흐름        |
| `student_disabled`    | 비활성                   | 로그인·작업 차단      |

그룹:

- `group_beginner`: student_a, student_b, student_first_login
- `group_project`: student_a, student_b
- student_a는 두 그룹에 소속

모듈:

- draft 1개
- version 1 발행 모듈
- version 2까지 발행한 모듈
- archived 모듈

## 4. 공통 정적 검증

| ID      | 검증                   | 통과 기준                      |
| ------- | ---------------------- | ------------------------------ |
| GEN-001 | lint                   | 오류 0                         |
| GEN-002 | typecheck              | 타입 오류 0                    |
| GEN-003 | unit/integration tests | 실패 0                         |
| GEN-004 | production build       | 성공                           |
| GEN-005 | 비밀값 검색            | 저장소에 실제 키·비밀번호 없음 |
| GEN-006 | 계획 문서 링크         | 깨진 로컬 링크 없음            |

비밀값 점검 예:

```bash
rg -n "service_role|SUPABASE_SERVICE_ROLE|password\\s*=|secret\\s*=" . \
  -g '!node_modules' -g '!.next' -g '!.git'
```

검색 결과는 사용 위치를 검토해야 하며 변수명 자체만으로 실패 처리하지 않는다. 실제 값 커밋 여부를 확인한다.

## 5. 경로 응답 검증

로컬 서버 실행 후:

```bash
curl -I http://localhost:3000/
curl -I http://localhost:3000/login
curl -I http://localhost:3000/learn
curl -I http://localhost:3000/admin
```

| 경로               | 미로그인 기대        | 관리자 기대              | 학생 기대             |
| ------------------ | -------------------- | ------------------------ | --------------------- |
| `/`                | 200                  | 200 또는 역할 홈 이동    | 200 또는 역할 홈 이동 |
| `/login`           | 200                  | 역할 홈 이동 가능        | 역할 홈 이동 가능     |
| `/change-password` | 로그인 이동          | 필요 상태에 따라 접근    | 필요 상태에 따라 접근 |
| `/admin`           | `/login?next=/admin` | 200                      | 403/역할 홈           |
| `/admin/modules`   | 로그인 이동          | 200                      | 접근 거부             |
| `/admin/students`  | 로그인 이동          | 200                      | 접근 거부             |
| `/admin/groups`    | 로그인 이동          | 200                      | 접근 거부             |
| `/admin/reviews`   | 로그인 이동          | 200                      | 접근 거부             |
| `/learn`           | `/login?next=/learn` | 관리자 홈 또는 접근 거부 | 200                   |
| `/learn/{own}`     | 로그인 이동          | 200                      | 소유 학생만 200       |
| `/learn/{other}`   | 로그인 이동          | 200                      | 404/접근 거부         |
| `/history`         | 로그인 이동          | 관리자 홈 또는 접근 거부 | 200                   |

리다이렉트 응답 코드는 프레임워크 구현에 따라 302/303/307/308 중 하나일 수 있으나 목적지와 반복 루프가 없어야 한다.

## 6. 인증 시나리오

| ID       | 시나리오                           | 통과 기준                        |
| -------- | ---------------------------------- | -------------------------------- |
| AUTH-T01 | 올바른 관리자 로그인               | `/admin` 진입                    |
| AUTH-T02 | 올바른 학생 로그인                 | `/learn` 진입                    |
| AUTH-T03 | 잘못된 아이디                      | 일반 실패 문구, 존재 여부 비노출 |
| AUTH-T04 | 잘못된 비밀번호                    | AUTH-T03과 같은 수준의 문구      |
| AUTH-T05 | 반복 실패                          | 속도 제한 또는 일시 차단         |
| AUTH-T06 | 최초 로그인                        | `/change-password` 강제          |
| AUTH-T07 | 변경 전 보호 URL 직접 접근         | `/change-password`로 복귀        |
| AUTH-T08 | 비밀번호 변경 성공                 | 원래 허용 경로 또는 역할 홈      |
| AUTH-T09 | 비활성 계정 로그인                 | 실패, 기존 데이터는 유지         |
| AUTH-T10 | 로그아웃                           | 세션 제거, 보호 경로 재접근 차단 |
| AUTH-T11 | 외부 `next` URL                    | 외부 이동 차단                   |
| AUTH-T12 | 관리자 계정 생성 API를 학생이 호출 | 403/권한 오류                    |

## 7. 계정과 그룹 시나리오

| ID      | 시나리오                  | 통과 기준                               |
| ------- | ------------------------- | --------------------------------------- |
| ACC-T01 | 고유 아이디 학생 생성     | Auth+profile 모두 생성                  |
| ACC-T02 | 중복 아이디 생성          | 아무 추가 데이터 없이 실패              |
| ACC-T03 | Auth 성공 후 profile 실패 | 고아 Auth 계정 복구/기록                |
| ACC-T04 | 비밀번호 재설정           | 새 임시 비밀번호 로그인, 최초 변경 강제 |
| ACC-T05 | 계정 비활성화             | 로그인 차단, 기록 보존                  |
| GRP-T01 | 학생을 두 그룹에 추가     | 양쪽 멤버십 존재                        |
| GRP-T02 | 같은 그룹 중복 추가       | unique 제약으로 차단                    |
| GRP-T03 | 그룹에서 학생 제거        | 과거 learner_assignment 유지            |
| GRP-T04 | 그룹 보관                 | 새 배정 선택 제외, 과거 기록 유지       |

## 8. 모듈과 버전 시나리오

| ID      | 시나리오            | 통과 기준                      |
| ------- | ------------------- | ------------------------------ |
| MOD-T01 | 필수값 없는 발행    | 필드 오류, 초안 유지           |
| MOD-T02 | 모든 P0 블록 저장   | 새로고침 후 동일 렌더          |
| MOD-T03 | 이미지/PDF 업로드   | private 저장, 미리보기         |
| MOD-T04 | 악성 스크립트 입력  | 실행되지 않고 안전 처리        |
| MOD-T05 | version 1 발행      | immutable snapshot 생성        |
| MOD-T06 | 발행 후 직접 UPDATE | DB/애플리케이션에서 거부       |
| MOD-T07 | 새 버전 발행        | version 2 생성, version 1 유지 |
| MOD-T08 | 기존 카드 확인      | version 1 콘텐츠 유지          |
| MOD-T09 | 모듈 복제           | 새 draft, 새 ID                |
| MOD-T10 | 모듈 보관           | 새 배정 목록 제외              |

## 9. 배정 시나리오

| ID      | 시나리오                   | 통과 기준                    |
| ------- | -------------------------- | ---------------------------- |
| ASN-T01 | 학생 한 명 배정            | learner_assignment 1개       |
| ASN-T02 | 학생 3명 직접 선택         | 서로 다른 카드 3개           |
| ASN-T03 | 3명 그룹 배정              | 카드 3개, source_group 보존  |
| ASN-T04 | 한 학생이 대상에 중복 포함 | 같은 batch에서 카드 1개      |
| ASN-T05 | 열린 동일 버전 카드 존재   | 경고 후 명시 확인 필요       |
| ASN-T06 | 중복 클릭                  | idempotency로 한 배치만 생성 |
| ASN-T07 | 중간 DB 실패               | 배치와 학생 카드 모두 0개    |
| ASN-T08 | 검토 후 그룹 변경          | 재확인 전 실행 차단          |
| ASN-T09 | 배정 후 신규 그룹 멤버     | 과거 카드 자동 생성 안 됨    |
| ASN-T10 | 활동 전 취소               | cancelled, 새 활동 차단      |
| ASN-T11 | 활동 후 중단               | stopped, 기존 이력 유지      |

## 10. 학습과 제출 시나리오

| ID      | 시나리오                  | 통과 기준                        |
| ------- | ------------------------- | -------------------------------- |
| LRN-T01 | 카드 최초 열람            | first_opened_at 한 번 기록       |
| LRN-T02 | 재열람                    | 최초 시각 변경 없음              |
| LRN-T03 | 학습 시작                 | in_progress와 started_at         |
| LRN-T04 | 수강 완료                 | course_completed, 과제 상태 독립 |
| LRN-T05 | 수강 완료 취소            | 허용 상태 복귀와 이벤트          |
| SUB-T01 | 텍스트 제출               | revision 1 생성                  |
| SUB-T02 | 링크 제출                 | http/https만 허용                |
| SUB-T03 | 이미지 제출               | 미리보기와 private path          |
| SUB-T04 | 일반 파일 제출            | 이름·형식·크기 표시              |
| SUB-T05 | 네 유형 혼합 제출         | 순서와 항목 모두 보존            |
| SUB-T06 | 빈 제출                   | 차단                             |
| SUB-T07 | 초과 크기                 | 해당 파일만 차단                 |
| SUB-T08 | 실행 파일                 | 안전상 차단                      |
| SUB-T09 | 업로드 중 제출            | 차단                             |
| SUB-T10 | 초안 저장 후 새로고침     | 내용 복원                        |
| SUB-T11 | 제출 후 수정 요청         | 직접 수정 차단                   |
| SUB-T12 | 재제출                    | revision 2, revision 1 보존      |
| SUB-T13 | 완료 카드 제출            | 차단                             |
| SUB-T14 | 학생 B가 학생 A 제출 접근 | 404/권한 거부                    |

## 11. 피드백 시나리오

| ID      | 시나리오                        | 통과 기준                          |
| ------- | ------------------------------- | ---------------------------------- |
| FDB-T01 | 일반 피드백                     | 메시지 생성, 상태 feedback_given   |
| FDB-T02 | 재제출 요청 본문 없음           | 차단                               |
| FDB-T03 | 재제출 요청                     | revision_requested, 학생 우선 표시 |
| FDB-T04 | 학생 첫 읽음                    | read_by_student_at 기록            |
| FDB-T05 | 피드백 재열람                   | 최초 읽음 시각 유지                |
| FDB-T06 | 학생 답변                       | student_reply만 허용               |
| FDB-T07 | 학생이 final_approval 생성 시도 | 거부                               |
| FDB-T08 | 최종 완료                       | completed와 completed_at           |
| FDB-T09 | 완료 후 새 제출                 | 거부                               |
| FDB-T10 | 관리자 완료 취소                | 이벤트와 허용 상태 복귀            |
| FDB-T11 | 첨부 피드백                     | 본인 학생과 관리자만 접근          |
| FDB-T12 | 다른 학생 피드백 URL            | 404/권한 거부                      |

## 12. RLS 교차 계정 검증

학생 A 세션에서 다음을 직접 API/SDK 수준으로 시도한다.

- 학생 B profile SELECT
- 학생 B learner_assignment SELECT/UPDATE
- 학생 B submission SELECT/INSERT/UPDATE
- 학생 B feedback SELECT/INSERT
- 학생 B Storage 객체 목록/다운로드
- admin 전용 테이블 INSERT/UPDATE
- module_templates 전체 조회

통과 기준:

- 허용된 본인 행 외 결과가 0개다.
- 민감 작업은 명시적 권한 오류다.
- 존재하지 않음과 권한 없음을 통해 다른 학생 데이터 존재를 추론하기 어렵다.

관리자 세션에서도 service role에 의존하지 않는 일반 운영 조회가 필요한 범위에서 작동하는지 확인한다.

## 13. Storage 검증

| ID      | 검증                  | 통과 기준                    |
| ------- | --------------------- | ---------------------------- |
| STO-T01 | 버킷 공개 여부        | 3개 모두 private             |
| STO-T02 | 소유 경로 업로드      | 허용                         |
| STO-T03 | 다른 학생 경로 업로드 | 거부                         |
| STO-T04 | 권한 없는 다운로드    | 거부                         |
| STO-T05 | 서명 URL              | 제한 시간 내만 접근          |
| STO-T06 | 만료 URL              | 접근 불가                    |
| STO-T07 | DB 참조 없는 업로드   | orphaned로 탐지              |
| STO-T08 | 파일명 경로 조작      | 안전 경로로 치환/거부        |
| STO-T09 | MIME 위장             | 서버 정책으로 탐지/거부      |
| STO-T10 | service role 노출     | 브라우저 번들·Network에 없음 |

## 14. 반응형·접근성 검증

뷰포트:

- 360×800
- 390×844
- 768×1024
- 1440×900

체크:

- [ ] 가로 스크롤 없이 핵심 모바일 화면 사용
- [ ] 표가 카드 또는 안전한 스크롤로 전환
- [ ] 버튼 최소 터치 영역 확보
- [ ] 키보드만으로 모든 P0 행동 가능
- [ ] 포커스 순서가 시각 순서와 일치
- [ ] 모달 열림/닫힘 시 포커스 복귀
- [ ] 입력과 오류 메시지가 연결됨
- [ ] 상태가 색상과 텍스트/아이콘으로 함께 표현
- [ ] 이미지 대체 텍스트
- [ ] 제목 계층이 논리적
- [ ] 확대 200%에서도 기능 사용 가능

## 15. 성능 검증

초기 운영 fixture:

- 학생 100명
- 그룹 20개
- 모듈 100개
- 학생별 배정 100개
- 제출 차수 3개
- 피드백 메시지 20개인 카드 일부

통과 기준:

- 관리자 목록은 페이지네이션된다.
- 카드 목록은 필요한 필드만 가져온다.
- 대시보드가 학생별 개별 쿼리 반복을 만들지 않는다.
- 이미지가 원본 전체 크기로 목록에 로드되지 않는다.
- 일반 네트워크에서 주요 콘텐츠 표시 목표 2.5초를 심각하게 초과하지 않는다.
- 업로드 중 UI가 멈추지 않는다.

성능 목표는 실제 Preview 환경 측정 후 조정하되 데이터 누출 방지를 위해 캐시 범위를 넓히지 않는다.

## 16. 오류·복구 검증

- [ ] DB 연결 실패 시 입력을 가능한 한 유지
- [ ] 배정 트랜잭션 실패 시 부분 결과 없음
- [ ] 업로드 하나 실패해도 다른 초안 항목 유지
- [ ] Auth 생성과 profile 생성 불일치 탐지
- [ ] 세션 만료 후 원래 경로 복귀
- [ ] 제출 중 새로고침 후 중복 차수 방지
- [ ] 중복 클릭으로 배정·제출·완료가 중복되지 않음
- [ ] 완료 상태와 이벤트가 불일치하지 않음
- [ ] 운영자가 실패 원인을 로그 ID로 찾을 수 있음

## 17. 미래 기능 비활성 검증

| 기능          | 기대                                |
| ------------- | ----------------------------------- |
| notifications | 외부 발송 없음, 준비 중 또는 숨김   |
| schedule      | CRUD/API/DB 테이블 없음             |
| payments      | 결제 SDK·외부 호출·거래 테이블 없음 |
| ai_feedback   | 모델 API 호출·자동 메시지 생성 없음 |

네 기능 플래그는 Production seed에서 모두 false여야 한다.

## 18. Production smoke test

배포 직후 실제 운영 URL에서 수행한다.

```bash
npm run build
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/login
curl -I https://YOUR_DOMAIN/admin
curl -I https://YOUR_DOMAIN/learn
```

수동:

1. 관리자 로그인
2. 테스트 학생 생성
3. 테스트 그룹 추가
4. 이미지·PDF 포함 모듈 작성 및 발행
5. 그룹 배정
6. 학생 최초 로그인과 비밀번호 변경
7. 학습 시작·수강 완료
8. 텍스트·링크·이미지·파일 혼합 제출
9. 관리자 재제출 요청
10. 학생 재제출
11. 관리자 최종 완료
12. 학생 완료 이력 확인
13. 다른 학생 계정으로 URL·파일 접근 차단 확인

## 19. 출시 차단 기준

다음 중 하나라도 있으면 출시하지 않는다.

- 다른 학생 데이터 또는 파일 접근 가능
- service role, 비밀번호, 세션 토큰 노출
- 미로그인 보호 데이터 접근 가능
- 발행 모듈 버전 수정 가능
- 제출된 차수 수정 또는 덮어쓰기 가능
- 그룹 배정 부분 성공
- 최종 완료 상태와 이력 불일치
- 파일 버킷 public
- 주요 P0 흐름 build/runtime 오류
- 치명적 접근성 문제로 로그인·제출 불가

## 20. Phase 통과 기록 양식

```text
Phase:
검증일:
검증 환경:
커밋:

자동 검증:
- lint:
- typecheck:
- test:
- e2e:
- build:

브라우저 확인:
- 데스크톱:
- 모바일:
- 역할/권한:

실패와 처리:
-

남은 알려진 문제:
-

다음 Phase 진입:
- 승인 / 보류
```

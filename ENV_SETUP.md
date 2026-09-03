# 운영 환경 설정 및 배포 체크리스트

- 작성일: 2026-09-03
- 목적: 사용자가 준비되었을 때 환경변수와 외부 서비스를 한 번에 연결
- 현재 코드 기본값: `demo` 모드

이 문서의 값은 예시입니다. 실제 URL과 키를 Git, 메신저, 문서, 스크린샷에 기록하지 마세요. 특히 `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출하면 안 됩니다.

## 1. 준비할 값

Supabase 새 프로젝트를 만든 뒤 다음 값을 준비합니다.

| 값                                    | 찾는 위치                          | 공개 여부          |
| ------------------------------------- | ---------------------------------- | ------------------ |
| Project Ref                           | 프로젝트 URL 또는 General Settings | 식별자             |
| Database password                     | 프로젝트 생성 시 지정              | 비밀               |
| Project URL                           | Settings → API                     | 브라우저 사용 가능 |
| Publishable key                       | Settings → API Keys                | 브라우저 사용 가능 |
| Secret 또는 legacy `service_role` key | Settings → API Keys                | 서버 전용 비밀     |

운영 관리자용 값도 정합니다.

- 로그인 아이디: 영문 소문자·숫자·점·밑줄·하이픈, 4~32자
- 초기 비밀번호: 8자 이상, 영문과 숫자 포함; 실제로는 더 긴 무작위 값 권장
- 표시 이름: 강사 화면에 보일 이름

## 2. Supabase Auth 잠금

Supabase Dashboard의 Authentication 설정에서 다음을 확인합니다.

1. `Allow new users to sign up`을 끕니다.
2. Anonymous sign-in을 끕니다.
3. Email provider는 켜 둡니다. 앱은 강사 발급 아이디를 내부 이메일 형식으로 변환해 password 로그인을 사용합니다.
4. 비밀번호 최소 길이와 공격 방지 설정을 운영 기준에 맞게 강화합니다.

앱에는 회원가입 화면이 없지만, 첫 번째 항목을 꺼야 외부에서 Auth signup API를 직접 호출하는 것도 막을 수 있습니다. 관리자 서버의 `auth.admin.createUser`는 별도 서버 권한으로 동작합니다.

## 3. 운영 DB 마이그레이션

프로젝트 루트에서 실행합니다.

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`--dry-run` 결과에 `supabase/migrations/202609030001_initial_schema.sql`이 포함되는지 확인한 뒤 실제 push를 실행합니다. 운영에서는 `db reset --linked` 또는 `--include-seed`를 사용하지 마세요.

마이그레이션은 다음을 만듭니다.

- 핵심 테이블, 인덱스, 상태 전이 RPC, 활동 이벤트
- 모든 보호 테이블의 RLS 정책
- `module-assets`, `submission-assets`, `feedback-assets` private 버킷
- 비활성 상태의 알림·일정·결제·AI feature flag

## 4. 로컬 `.env.local` 입력

루트의 `.env.local`을 다음 형식으로 채웁니다.

```dotenv
NEXT_PUBLIC_APP_MODE=supabase
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# 서버 전용. NEXT_PUBLIC_ 접두사를 붙이지 않습니다.
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_OR_SERVICE_ROLE_KEY

# 최초 관리자 생성 때만 임시 입력
BOOTSTRAP_ADMIN_LOGIN_ID=admin
BOOTSTRAP_ADMIN_PASSWORD=YOUR_LONG_RANDOM_PASSWORD
BOOTSTRAP_ADMIN_DISPLAY_NAME=강사
```

`.env.local`은 `.gitignore`에 포함되어 있습니다. 입력 후 다음 점검에서 실제 값이 Git 상태에 나타나지 않아야 합니다.

```bash
git status --short
```

## 5. 최초 관리자 계정 1회 생성

마이그레이션과 `.env.local` 입력 후 실행합니다.

```bash
npm run setup:admin
```

성공 메시지를 확인한 뒤 `.env.local`에서 아래 세 값을 비우거나 제거합니다.

```dotenv
BOOTSTRAP_ADMIN_LOGIN_ID=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_DISPLAY_NAME=
```

`SUPABASE_SERVICE_ROLE_KEY`는 학생 생성·비밀번호 재설정·비활성화를 위해 운영 서버에 계속 필요합니다. Bootstrap 명령은 같은 아이디로 두 번 실행하지 마세요.

## 5-1. 노션 강의 모듈 11개 등록

관리자 계정을 만든 다음 아래 명령을 한 번 실행합니다.

```bash
npm run setup:modules
```

이 명령은 `content/notion-modules.json`의 강의 11개를 해당 관리자 소유의 발행 모듈로 등록하고, 화면 자료 23개를 private `module-assets` 버킷에 업로드합니다. 같은 제목의 모듈이 이미 있으면 초안을 갱신하고, 내용이 바뀐 경우에만 새 불변 버전을 발행하므로 재실행해도 중복 모듈을 만들지 않습니다. 활성 관리자가 여러 명이면 `.env.local`의 `BOOTSTRAP_ADMIN_LOGIN_ID`에 대상 관리자 아이디를 지정한 상태로 실행하세요.

## 6. 로컬 운영 모드 확인

```bash
npm run verify
npm run dev
```

`http://localhost:3000/login`에서 방금 만든 관리자 계정으로 로그인한 뒤 다음을 확인합니다.

1. 학생 한 명 발급
2. 학생으로 최초 로그인 및 비밀번호 변경
3. 모듈 작성·발행
4. 학생에게 카드 배정
5. 학생 결과 제출
6. 관리자가 피드백하고 최종 완료

### 전용 테스트 프로젝트에서만 실행할 추가 검증

아래 검증은 다수의 테스트 계정과 기록을 생성합니다. 운영 프로젝트에서 실행하지 마세요.

```bash
SUPABASE_VERIFY_ALLOW_WRITE=true npm run verify:supabase
RUN_SUPABASE_E2E=true npm run test:e2e
```

두 명령에는 이 문서 4절의 Supabase 환경변수가 설정되어 있어야 합니다.

## 7. Vercel 연결

Git 저장소를 Vercel에 Import하거나 프로젝트 루트에서 `vercel`을 실행합니다. Framework Preset은 Next.js, Root Directory는 이 저장소 루트입니다.

Vercel Project Settings → Environment Variables에 아래 값만 등록합니다. Preview와 Production에 각각 올바른 Supabase 프로젝트 값을 넣는 것이 안전합니다.

```dotenv
NEXT_PUBLIC_APP_MODE=supabase
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_OR_SERVICE_ROLE_KEY
```

Bootstrap 3개 변수는 Vercel에 등록하지 않습니다. `SUPABASE_SERVICE_ROLE_KEY`는 반드시 Sensitive/Secret으로 관리합니다. 환경변수를 바꾼 뒤에는 새 배포 또는 Redeploy가 필요합니다.

CLI를 쓸 경우:

```bash
npx vercel link
npx vercel
# Preview 확인 후
npx vercel --prod
```

## 8. 배포 후 점검

```bash
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/login
curl -I https://YOUR_DOMAIN/admin
curl -I https://YOUR_DOMAIN/learn
```

기대 결과:

- `/`와 `/login`: 정상 응답
- 미로그인 `/admin`, `/learn`: `/login?next=...`로 이동
- 학생 세션의 `/admin`: 접근 거부 또는 역할 홈
- 관리자 세션의 학생 전용 화면: 접근 거부 또는 관리자 홈

시크릿 창과 모바일에서도 6절의 전체 흐름을 한 번 완주합니다. Supabase Storage의 세 버킷이 모두 public=false인지, 학생 A가 학생 B 파일을 열 수 없는지도 확인합니다.

## 9. 운영 시작 전 체크박스

- [ ] Supabase 신규 가입과 익명 가입 비활성화
- [ ] DB migration dry-run 검토 후 push
- [ ] 운영 관리자 생성 후 bootstrap 비밀번호 제거
- [ ] Vercel Preview/Production 환경변수 분리
- [ ] service role/secret key가 서버 변수에만 존재
- [ ] Preview 전체 흐름 확인
- [ ] Production 미로그인·관리자·학생·모바일 smoke test
- [ ] Supabase 자동 백업/복구 정책 확인
- [ ] 실제 학생을 만들기 전 운영 승인

## 공식 참고 문서

- [Supabase CLI database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

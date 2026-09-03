# Data Model: GQAI Study

- 작성일: 2026-09-03
- 대상 데이터베이스: Supabase Postgres
- 인증: Supabase Auth
- 파일: Supabase Storage 비공개 버킷
- 모델 상태: 2026-09-03 구현 반영본

## 1. 모델링 원칙

1. Auth 사용자 ID를 모든 개인 데이터의 최상위 식별자로 사용한다.
2. 로그인 아이디와 표시 이름만 프로필에 저장하고 비밀번호는 저장하지 않는다.
3. 재사용 콘텐츠와 학생 실행 기록을 분리한다.
4. 발행된 모듈 버전은 불변이다.
5. 그룹 배정은 학생별 배정 행으로 펼친다.
6. 제출과 피드백은 수정 이력을 덮어쓰지 않는다.
7. 삭제보다 비활성·보관 상태를 우선한다.
8. 모든 사용자 입력 테이블에 생성·수정 시각을 둔다.
9. 모든 보호 테이블에 RLS를 활성화한다.
10. 관리자 서버 작업도 역할과 대상 범위를 다시 검사한다.

## 2. 핵심 관계

```text
auth.users
  └─ profiles
       ├─< group_members >─ groups
       ├─< learner_assignments >─ assignment_batches
       │                              └─ module_versions >─ module_templates
       ├─< submissions >─ learner_assignments
       │       └─< submission_items
       └─< feedback_messages >─ learner_assignments
               └─< feedback_attachments

learner_assignments ─< activity_events
learner_assignments ── student_notes (학생 본인만 조회)
module_templates ─< module_versions
module_templates ─< module_assets
```

## 3. 열거형 초안

| 열거형                   | 값                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `profile_role`           | `admin`, `student`                                                                                                       |
| `module_status`          | `draft`, `active`, `archived`                                                                                            |
| `difficulty_level`       | `beginner`, `intermediate`, `advanced`                                                                                   |
| `assignment_target_kind` | `students`, `group`                                                                                                      |
| `learning_status`        | `not_started`, `in_progress`, `course_completed`                                                                         |
| `assignment_status`      | `not_submitted`, `submitted`, `feedback_given`, `revision_requested`, `resubmitted`, `completed`, `cancelled`, `stopped` |
| `submission_status`      | `draft`, `submitted`, `superseded`                                                                                       |
| `submission_item_type`   | `text`, `link`, `image`, `file`                                                                                          |
| `feedback_kind`          | `feedback`, `revision_request`, `student_reply`, `final_approval`, `completion_reopened`                                 |
| `asset_state`            | `pending`, `ready`, `failed`, `orphaned`                                                                                 |

열거형 변경은 마이그레이션 비용이 있으므로 실제 구현에서 문자열 체크 제약과 비교한 후 확정한다.

## 4. 테이블 상세

### 4.1 `profiles`

Auth 사용자와 1:1로 연결되는 서비스 프로필.

| 필드                   | 타입         | 필수   | 규칙                                        |
| ---------------------- | ------------ | ------ | ------------------------------------------- |
| `id`                   | uuid         | 예     | PK, `auth.users.id` FK                      |
| `role`                 | profile_role | 예     | `admin` 또는 `student`                      |
| `login_id`             | citext       | 예     | unique, 정규화된 4~32자                     |
| `display_name`         | text         | 예     | 1~50자                                      |
| `must_change_password` | boolean      | 예     | 기본 true, 관리자 계정은 초기 설정에서 결정 |
| `is_active`            | boolean      | 예     | 기본 true                                   |
| `last_login_at`        | timestamptz  | 아니오 | 로그인 성공 후 갱신                         |
| `created_by`           | uuid         | 아니오 | 관리자 ID, 최초 관리자는 null 가능          |
| `deactivated_at`       | timestamptz  | 아니오 | 비활성 시각                                 |
| `created_at`           | timestamptz  | 예     | 기본 now                                    |
| `updated_at`           | timestamptz  | 예     | 변경 시 갱신                                |

제약:

- `login_id` 정규식: `^[a-z0-9][a-z0-9._-]{3,31}$`
- 비활성화 시 `deactivated_at` 필수
- 학생은 최소 한 명의 관리자가 생성
- 비밀번호, 내부 Auth 토큰, 임시 비밀번호를 저장하지 않음

### 4.2 `groups`

학생 일괄 선택을 위한 관리 묶음.

| 필드          | 타입        | 필수   | 규칙                        |
| ------------- | ----------- | ------ | --------------------------- |
| `id`          | uuid        | 예     | PK                          |
| `name`        | text        | 예     | 활성 그룹 내 중복 정책 적용 |
| `description` | text        | 아니오 | 최대 길이 제한              |
| `is_archived` | boolean     | 예     | 기본 false                  |
| `created_by`  | uuid        | 예     | 관리자 프로필 FK            |
| `archived_at` | timestamptz | 아니오 | 보관 시각                   |
| `created_at`  | timestamptz | 예     | 기본 now                    |
| `updated_at`  | timestamptz | 예     | 변경 시 갱신                |

### 4.3 `group_members`

그룹과 학생의 다대다 관계.

| 필드         | 타입        | 필수 | 규칙                      |
| ------------ | ----------- | ---- | ------------------------- |
| `id`         | uuid        | 예   | PK                        |
| `group_id`   | uuid        | 예   | groups FK                 |
| `student_id` | uuid        | 예   | profiles FK, role=student |
| `added_by`   | uuid        | 예   | 관리자 FK                 |
| `added_at`   | timestamptz | 예   | 기본 now                  |

제약:

- unique(`group_id`, `student_id`)
- 그룹에서 제거할 때 관계 행은 삭제할 수 있으나 과거 배정의 `source_group_id`는 유지
- 학생 또는 그룹 보관이 기존 배정에 cascade 되지 않음

### 4.4 `module_templates`

모듈의 편집 가능한 원본과 초안.

| 필드                            | 타입             | 필수   | 규칙                       |
| ------------------------------- | ---------------- | ------ | -------------------------- |
| `id`                            | uuid             | 예     | PK                         |
| `title`                         | text             | 예     | 1~150자                    |
| `summary`                       | text             | 아니오 | 목록 카드 요약             |
| `category`                      | text             | 아니오 | 초기에는 자유 텍스트       |
| `difficulty`                    | difficulty_level | 아니오 | 난이도                     |
| `estimated_minutes`             | integer          | 아니오 | 1 이상                     |
| `tags`                          | text[]           | 예     | 기본 빈 배열               |
| `status`                        | module_status    | 예     | 기본 draft                 |
| `draft_content`                 | jsonb            | 예     | 제한된 블록 스키마         |
| `draft_learning_objectives`     | jsonb            | 예     | 순서 있는 문자열 목록      |
| `draft_prerequisites`           | jsonb            | 예     | 준비물·선행 조건           |
| `draft_submission_requirements` | jsonb            | 예     | 제출 요구 항목             |
| `draft_completion_criteria`     | jsonb            | 예     | 완료 기준                  |
| `draft_schema_version`          | integer          | 예     | 콘텐츠 JSON 마이그레이션용 |
| `current_published_version_id`  | uuid             | 아니오 | module_versions FK         |
| `created_by`                    | uuid             | 예     | 관리자 FK                  |
| `updated_by`                    | uuid             | 예     | 관리자 FK                  |
| `created_at`                    | timestamptz      | 예     | 기본 now                   |
| `updated_at`                    | timestamptz      | 예     | 자동 갱신                  |
| `archived_at`                   | timestamptz      | 아니오 | 보관 시각                  |

초안 콘텐츠 블록 최소 스키마:

```json
{
  "schemaVersion": 1,
  "blocks": [
    {
      "id": "stable-block-id",
      "type": "paragraph",
      "data": {}
    }
  ]
}
```

허용 `type`:

- `paragraph`
- `heading`
- `bullet_list`
- `numbered_list`
- `checklist`
- `quote`
- `divider`
- `code`
- `link`
- `image`
- `pdf`
- `attachment`

서버는 알 수 없는 블록, 임의 HTML, 스크립트 속성을 거부하거나 안전한 텍스트로 처리한다.

### 4.5 `module_versions`

발행 시 생성되는 불변 스냅샷.

| 필드                               | 타입        | 필수   | 규칙                          |
| ---------------------------------- | ----------- | ------ | ----------------------------- |
| `id`                               | uuid        | 예     | PK                            |
| `module_template_id`               | uuid        | 예     | module_templates FK           |
| `version_number`                   | integer     | 예     | 1부터 증가                    |
| `title_snapshot`                   | text        | 예     | 발행 당시 제목                |
| `summary_snapshot`                 | text        | 아니오 | 발행 당시 요약                |
| `metadata_snapshot`                | jsonb       | 예     | 카테고리·난이도·예상시간·태그 |
| `content_snapshot`                 | jsonb       | 예     | 발행 당시 콘텐츠              |
| `learning_objectives_snapshot`     | jsonb       | 예     | 학습 목표                     |
| `prerequisites_snapshot`           | jsonb       | 예     | 준비물                        |
| `submission_requirements_snapshot` | jsonb       | 예     | 제출 요구                     |
| `completion_criteria_snapshot`     | jsonb       | 예     | 완료 기준                     |
| `schema_version`                   | integer     | 예     | 렌더러 호환성                 |
| `content_checksum`                 | text        | 예     | 변조·중복 확인                |
| `published_by`                     | uuid        | 예     | 관리자 FK                     |
| `published_at`                     | timestamptz | 예     | 기본 now                      |

제약:

- unique(`module_template_id`, `version_number`)
- 애플리케이션 역할에 UPDATE와 DELETE 권한 부여 금지
- 기존 배정이 있는 버전은 영구 보존

### 4.6 `module_assets`

모듈 초안과 발행 버전이 참조하는 비공개 자료.

| 필드                 | 타입        | 필수   | 규칙                   |
| -------------------- | ----------- | ------ | ---------------------- |
| `id`                 | uuid        | 예     | PK                     |
| `module_template_id` | uuid        | 예     | 템플릿 FK              |
| `storage_path`       | text        | 예     | unique                 |
| `asset_kind`         | text        | 예     | image, pdf, attachment |
| `original_name`      | text        | 예     | 안전하게 표시          |
| `mime_type`          | text        | 예     | 서버 검증 결과         |
| `size_bytes`         | bigint      | 예     | 양수, 상한 적용        |
| `alt_text`           | text        | 아니오 | 이미지 접근성          |
| `state`              | asset_state | 예     | 업로드 상태            |
| `uploaded_by`        | uuid        | 예     | 관리자 FK              |
| `created_at`         | timestamptz | 예     | 기본 now               |

발행 버전이 참조한 `ready` 자산은 파일 경로를 덮어쓰지 않는다. 교체는 새 asset 행을 만든다.

### 4.7 `assignment_batches`

관리자가 한 번 실행한 배정 작업.

| 필드                 | 타입                   | 필수   | 규칙                        |
| -------------------- | ---------------------- | ------ | --------------------------- |
| `id`                 | uuid                   | 예     | PK                          |
| `module_version_id`  | uuid                   | 예     | module_versions FK          |
| `target_kind`        | assignment_target_kind | 예     | students 또는 group         |
| `source_group_id`    | uuid                   | 아니오 | group일 때 필수             |
| `common_instruction` | text                   | 아니오 | 대상 공통 안내              |
| `target_snapshot`    | jsonb                  | 예     | 실행 당시 학생 ID·표시 이름 |
| `recipient_count`    | integer                | 예     | 생성 예정/완료 수           |
| `idempotency_key`    | text                   | 예     | unique, 중복 요청 방지      |
| `assigned_by`        | uuid                   | 예     | 관리자 FK                   |
| `assigned_at`        | timestamptz            | 예     | 기본 now                    |

제약:

- `target_kind=group`이면 `source_group_id` 필수
- `target_kind=students`이면 `source_group_id` null
- 배치와 모든 학생별 배정은 하나의 DB 트랜잭션에서 생성
- `target_snapshot`은 표시 감사용이며 권한 판단에는 현재 프로필과 FK 사용

### 4.8 `learner_assignments`

학생별 배정 카드. 서비스의 핵심 실행 단위.

| 필드                   | 타입              | 필수   | 규칙                      |
| ---------------------- | ----------------- | ------ | ------------------------- |
| `id`                   | uuid              | 예     | PK                        |
| `assignment_batch_id`  | uuid              | 예     | assignment_batches FK     |
| `module_version_id`    | uuid              | 예     | module_versions FK        |
| `student_id`           | uuid              | 예     | profiles FK, role=student |
| `source_group_id`      | uuid              | 아니오 | 그룹 배정 출처 보존       |
| `personal_instruction` | text              | 아니오 | 학생별 추가 안내          |
| `learning_status`      | learning_status   | 예     | 기본 not_started          |
| `assignment_status`    | assignment_status | 예     | 기본 not_submitted        |
| `first_opened_at`      | timestamptz       | 아니오 | 최초 한 번                |
| `started_at`           | timestamptz       | 아니오 | 학습 시작                 |
| `course_completed_at`  | timestamptz       | 아니오 | 수강 완료                 |
| `last_activity_at`     | timestamptz       | 아니오 | 정렬용                    |
| `completed_at`         | timestamptz       | 아니오 | 최종 완료                 |
| `cancelled_at`         | timestamptz       | 아니오 | 활동 전 취소              |
| `stopped_at`           | timestamptz       | 아니오 | 활동 후 중단              |
| `created_at`           | timestamptz       | 예     | 기본 now                  |
| `updated_at`           | timestamptz       | 예     | 갱신                      |

제약:

- unique(`assignment_batch_id`, `student_id`)
- `completed`이면 `completed_at` 필수
- `cancelled`이면 제출이 없어야 함
- 학생이 변경할 수 있는 값은 검증된 RPC가 허용한 학습 상태로 제한
- 민감한 상태 전이는 직접 테이블 UPDATE보다 검증된 RPC/서버 작업 사용

### 4.9 `student_notes`

학생 본인만 읽고 쓸 수 있는 배정별 개인 메모. 관리자가 모든 `learner_assignments`를 조회하더라도 메모가 함께 노출되지 않도록 물리적으로 분리한다.

| 필드                    | 타입        | 필수 | 규칙                               |
| ----------------------- | ----------- | ---- | ---------------------------------- |
| `learner_assignment_id` | uuid        | 예   | PK, learner_assignments FK         |
| `student_id`            | uuid        | 예   | profiles FK, 카드 소유 학생과 일치 |
| `note`                  | text        | 예   | 기본 빈 문자열, 최대 10,000자      |
| `created_at`            | timestamptz | 예   | 기본 now                           |
| `updated_at`            | timestamptz | 예   | 자동 갱신                          |

제약과 권한:

- 카드당 최대 1개
- 소유 학생만 SELECT 가능
- 관리자 SELECT 정책을 만들지 않음
- 직접 INSERT/UPDATE 대신 `update_learning_state` RPC의 `note` action 사용
- 소유권 불일치는 trigger가 거부

### 4.10 `submissions`

제출 초안과 차수별 제출 기록.

| 필드                     | 타입              | 필수   | 규칙                                 |
| ------------------------ | ----------------- | ------ | ------------------------------------ |
| `id`                     | uuid              | 예     | PK                                   |
| `learner_assignment_id`  | uuid              | 예     | learner_assignments FK               |
| `student_id`             | uuid              | 예     | 소유권과 조회 최적화                 |
| `revision_number`        | integer           | 아니오 | 제출 시 1부터 증가, 초안은 null 가능 |
| `status`                 | submission_status | 예     | 기본 draft                           |
| `based_on_submission_id` | uuid              | 아니오 | 재제출 원본                          |
| `submitted_at`           | timestamptz       | 아니오 | submitted일 때 필수                  |
| `created_at`             | timestamptz       | 예     | 기본 now                             |
| `updated_at`             | timestamptz       | 예     | 초안 갱신                            |

제약:

- unique(`learner_assignment_id`, `revision_number`) where revision_number is not null
- 카드당 활성 초안 최대 1개
- submitted 이후 항목 수정 금지
- 학생 ID가 배정 카드의 학생 ID와 같아야 함

### 4.11 `submission_items`

한 제출에 포함된 혼합 형식 항목.

| 필드            | 타입                 | 필수   | 규칙                         |
| --------------- | -------------------- | ------ | ---------------------------- |
| `id`            | uuid                 | 예     | PK                           |
| `submission_id` | uuid                 | 예     | submissions FK               |
| `item_type`     | submission_item_type | 예     | text/link/image/file         |
| `sort_order`    | integer              | 예     | 0 이상                       |
| `text_content`  | text                 | 아니오 | text일 때 사용               |
| `url`           | text                 | 아니오 | link일 때 http/https         |
| `storage_path`  | text                 | 아니오 | image/file일 때 private path |
| `original_name` | text                 | 아니오 | 업로드 파일                  |
| `mime_type`     | text                 | 아니오 | 서버 확인                    |
| `size_bytes`    | bigint               | 아니오 | 상한 확인                    |
| `asset_state`   | asset_state          | 아니오 | 파일 항목 상태               |
| `created_at`    | timestamptz          | 예     | 기본 now                     |

제약:

- unique(`submission_id`, `sort_order`)
- item_type별 필요한 값만 존재하도록 CHECK
- submitted 제출의 항목은 UPDATE/DELETE 금지
- 파일 경로에는 원본 파일명을 그대로 사용하지 않고 생성한 안전 ID 사용

### 4.12 `feedback_messages`

배정 카드에 연결된 피드백 대화.

| 필드                    | 타입          | 필수   | 규칙                                     |
| ----------------------- | ------------- | ------ | ---------------------------------------- |
| `id`                    | uuid          | 예     | PK                                       |
| `learner_assignment_id` | uuid          | 예     | 카드 FK                                  |
| `submission_id`         | uuid          | 아니오 | 특정 제출 차수 대상                      |
| `author_id`             | uuid          | 예     | profiles FK                              |
| `kind`                  | feedback_kind | 예     | 메시지 성격                              |
| `body`                  | text          | 아니오 | 첨부만 있을 수 있으나 재제출 요청은 필수 |
| `read_by_student_at`    | timestamptz   | 아니오 | 관리자 메시지 읽음                       |
| `created_at`            | timestamptz   | 예     | 기본 now                                 |

규칙:

- 관리자는 feedback, revision_request, final_approval, completion_reopened 작성 가능
- 학생은 student_reply만 작성 가능
- revision_request는 body와 submission_id 필수
- final_approval 생성과 카드 completed 전환은 한 트랜잭션
- 메시지 수정·삭제는 MVP에서 제공하지 않음

### 4.13 `feedback_attachments`

피드백 메시지의 비공개 첨부파일.

| 필드                  | 타입        | 필수 | 규칙                 |
| --------------------- | ----------- | ---- | -------------------- |
| `id`                  | uuid        | 예   | PK                   |
| `feedback_message_id` | uuid        | 예   | feedback_messages FK |
| `storage_path`        | text        | 예   | unique               |
| `original_name`       | text        | 예   | 표시 이름            |
| `mime_type`           | text        | 예   | 서버 검증            |
| `size_bytes`          | bigint      | 예   | 상한 적용            |
| `state`               | asset_state | 예   | 기본 pending         |
| `uploaded_by`         | uuid        | 예   | 작성자와 동일        |
| `created_at`          | timestamptz | 예   | 기본 now             |

### 4.14 `activity_events`

상태 변경과 운영 감사를 위한 append-only 이벤트.

| 필드                    | 타입        | 필수   | 규칙                      |
| ----------------------- | ----------- | ------ | ------------------------- |
| `id`                    | uuid        | 예     | PK                        |
| `event_name`            | text        | 예     | 문서화된 이름             |
| `actor_id`              | uuid        | 아니오 | 시스템 이벤트는 null 가능 |
| `student_id`            | uuid        | 아니오 | 관련 학생                 |
| `learner_assignment_id` | uuid        | 아니오 | 관련 카드                 |
| `entity_type`           | text        | 예     | student, group, module 등 |
| `entity_id`             | uuid        | 예     | 대상                      |
| `metadata`              | jsonb       | 예     | 민감정보 제외             |
| `created_at`            | timestamptz | 예     | 기본 now                  |

규칙:

- 일반 클라이언트 UPDATE/DELETE 금지
- 비밀번호, 토큰, 제출 본문, 파일 서명 URL 저장 금지
- IP 등 개인정보성 로그가 필요하면 별도 보존 정책 승인 후 추가

### 4.15 `feature_flags`

미래 기능의 노출 위치를 통제한다.

| 필드          | 타입        | 필수   | 규칙                           |
| ------------- | ----------- | ------ | ------------------------------ |
| `key`         | text        | 예     | PK                             |
| `enabled`     | boolean     | 예     | 기본 false                     |
| `visibility`  | text        | 예     | hidden, admin_preview, visible |
| `description` | text        | 예     | 기능 범위                      |
| `updated_by`  | uuid        | 아니오 | 관리자                         |
| `updated_at`  | timestamptz | 예     | 갱신                           |

초기 키:

- `notifications`
- `schedule`
- `payments`
- `ai_feedback`

MVP에서는 모두 `enabled=false`다. 이 테이블은 기능 상태만 제어하며 결제·일정·AI 도메인 데이터는 만들지 않는다.

## 5. 주요 관계와 삭제 정책

| 부모                | 자식                | 삭제/보관 정책                                             |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| auth.users          | profiles            | 운영 UI에서 물리 삭제 금지                                 |
| groups              | group_members       | 관계 제거 가능, 과거 배정 유지                             |
| module_templates    | module_versions     | 발행 버전이 있으면 삭제 금지                               |
| module_versions     | assignment_batches  | 배정이 있으면 삭제 금지                                    |
| assignment_batches  | learner_assignments | 물리 삭제 금지                                             |
| learner_assignments | student_notes       | 카드 삭제 시 함께 제거하되 운영 UI에서 카드 물리 삭제 금지 |
| learner_assignments | submissions         | 물리 삭제 금지                                             |
| submissions         | submission_items    | 초안 삭제 시만 정리 가능                                   |
| learner_assignments | feedback_messages   | 물리 삭제 금지                                             |

개인정보 삭제 요청 정책을 확정할 때는 학습 이력 보존과 익명화 요구를 별도 설계한다.

## 6. CRUD 권한 요약

| 데이터              | 관리자 생성      | 관리자 조회/수정     | 학생 생성            | 학생 조회/수정            |
| ------------------- | ---------------- | -------------------- | -------------------- | ------------------------- |
| profiles            | 학생 생성        | 전체, 비활성·재설정  | 불가                 | 본인 조회                 |
| groups              | 가능             | 전체 관리            | 불가                 | 본인 소속 이름 조회       |
| group_members       | 가능             | 전체 관리            | 불가                 | 직접 조회 불필요          |
| module_templates    | 가능             | 전체 관리            | 불가                 | 불가                      |
| module_versions     | 발행으로 생성    | 전체 조회, 수정 불가 | 불가                 | 본인 배정 버전만 조회     |
| assignment_batches  | 가능             | 전체 조회            | 불가                 | 직접 조회 불필요          |
| learner_assignments | 배정으로 생성    | 전체 관리            | 불가                 | 본인 조회, 제한 상태 변경 |
| student_notes       | 불가             | 조회 불가            | RPC로 본인 메모 저장 | 본인만                    |
| submissions         | 전체 조회        | 검토용 조회          | 본인 초안·제출       | 본인만                    |
| submission_items    | 전체 조회        | 검토용 조회          | 본인 초안 항목       | 본인만                    |
| feedback_messages   | 관리자 종류 생성 | 전체 조회            | student_reply 생성   | 본인 카드만               |
| activity_events     | 서버 생성        | 전체 조회            | 서버를 통해 생성     | 본인 표시 대상 일부       |
| feature_flags       | 초기 seed        | 관리자만             | 불가                 | 읽기 불필요               |

## 7. RLS 정책 초안

### 7.1 공통 헬퍼

- `is_active_user()`: 현재 Auth 사용자 프로필이 활성인지 확인
- `is_admin()`: 활성 프로필의 role이 admin인지 확인
- `owns_assignment(assignment_id)`: 배정의 student_id가 auth.uid와 같은지 확인
- 헬퍼는 안전한 `SECURITY DEFINER`, 고정 search_path, 최소 권한으로 정의

### 7.2 테이블별 핵심 정책

`profiles`:

- 학생 SELECT: `id = auth.uid()`
- 관리자 SELECT: `is_admin()`
- INSERT/비활성/역할 변경: 관리자 서버 작업
- 학생의 role, is_active, login_id 직접 UPDATE 금지

`groups`, `group_members`:

- 관리자 전체 CRUD
- 학생은 자신의 멤버십에 연결된 그룹 이름만 제한적으로 읽는 뷰 사용
- 다른 구성원 프로필을 노출하지 않음

`module_templates`:

- 관리자만 CRUD
- 학생 직접 접근 없음

`module_versions`:

- 관리자 SELECT/INSERT
- 학생 SELECT: 해당 버전을 참조하는 본인 `learner_assignments`가 존재할 때
- UPDATE/DELETE 금지

`learner_assignments`:

- 관리자 전체 SELECT
- 학생 SELECT: `student_id = auth.uid()`
- 학생 상태 변경은 검증 RPC/서버 작업으로 제한

`student_notes`:

- 학생 SELECT: `student_id = auth.uid()`
- 관리자와 다른 학생 SELECT 정책 없음
- 쓰기는 카드 소유권을 검사하는 검증 RPC만 허용

`submissions`, `submission_items`:

- 학생 SELECT/INSERT: 본인 배정에 속한 경우
- UPDATE/DELETE: draft 상태이며 본인 소유인 경우
- 제출된 행은 변경 금지
- 관리자 SELECT: `is_admin()`

`feedback_messages`, `feedback_attachments`:

- 학생 SELECT: 본인 배정 카드
- 학생 INSERT: author_id=auth.uid, kind=student_reply
- 관리자 전체 SELECT/허용 종류 INSERT
- UPDATE/DELETE 금지

`activity_events`:

- 관리자 SELECT
- 사용자 직접 INSERT/UPDATE/DELETE 금지
- 검증된 서버 작업 또는 DB 함수만 INSERT

`feature_flags`:

- 관리자 읽기
- 변경은 서버 작업
- 학생 화면은 서버에서 필요한 노출 결정만 전달

## 8. Storage 설계

### 8.1 버킷

| 버킷                | 공개 여부 | 용도                             |
| ------------------- | --------- | -------------------------------- |
| `module-assets`     | private   | 강사 작성 모듈의 이미지·PDF·자료 |
| `submission-assets` | private   | 학생 제출 이미지·파일            |
| `feedback-assets`   | private   | 관리자·학생 피드백 첨부          |

### 8.2 경로 규칙

```text
module-assets/{module_template_id}/{asset_id}/{safe_filename}
submission-assets/{student_id}/{assignment_id}/{submission_id}/{item_id}/{safe_filename}
feedback-assets/{assignment_id}/{message_id}/{attachment_id}/{safe_filename}
```

원본 파일명은 메타데이터에 표시용으로 보존하되 경로 충돌이나 경로 조작에 사용하지 않는다.

### 8.3 접근 원칙

- 업로드 전에 DB 소유권과 상태를 확인한다.
- 학생은 본인 ID로 시작하는 제출 경로에만 업로드할 수 있다.
- 다운로드는 사용자 JWT 기반 접근 또는 짧은 만료의 서명 URL을 사용한다.
- 서명 URL 발급 전 매번 배정 소유권 또는 관리자 역할을 검사한다.
- URL, 토큰, service role 키를 로그에 남기지 않는다.
- public bucket 사용 금지.

### 8.4 파일 기본 정책

- 파일당 기본 상한: 50MB
- 이미지/PDF: 안전한 미리보기
- 일반 문서·압축·코드: 다운로드
- 실행 파일, 스크립트 실행형 설치 파일: 차단
- 확장자만 믿지 않고 MIME과 파일 시그니처 검토
- 파일명에서 경로 문자와 제어 문자를 제거
- 업로드 완료 전 제출 확정 금지

실제 허용 목록과 악성 파일 검사 방식은 운영 배포 전 최종 확정한다.

## 9. 상태 전이 함수 후보

직접 UPDATE를 줄이고 다음 원자적 작업을 DB 함수 또는 권한 검증된 서버 작업으로 묶는다.

- `create_student_account`
- `reset_student_password`
- `publish_module_version`
- `assign_module_to_students`
- `assign_module_to_group`
- `mark_assignment_opened`
- `start_learning`
- `toggle_course_completed`
- `submit_submission`
- `create_feedback`
- `request_revision`
- `complete_assignment`
- `reopen_completion`

각 함수는 현재 사용자, 현재 상태, 대상 소유권, 중복 실행 키를 확인한다.

## 10. 인덱스 초안

| 테이블              | 인덱스                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| profiles            | unique lower/login_id, role+is_active                                             |
| group_members       | unique group_id+student_id, student_id                                            |
| module_templates    | status+updated_at, category, 검색용 title                                         |
| module_versions     | unique template_id+version_number                                                 |
| assignment_batches  | assigned_at, source_group_id                                                      |
| learner_assignments | student_id+assignment_status+last_activity_at, module_version_id, source_group_id |
| submissions         | assignment_id+revision_number, student_id+submitted_at                            |
| submission_items    | submission_id+sort_order                                                          |
| feedback_messages   | assignment_id+created_at, submission_id                                           |
| activity_events     | assignment_id+created_at, event_name+created_at                                   |

실제 쿼리 계획을 본 뒤 불필요한 인덱스는 제거한다.

## 11. 트랜잭션 경계

다음 작업은 부분 성공을 허용하지 않는다.

1. Auth 학생 생성 + profile 생성 + 초기 그룹 추가
2. 모듈 버전 생성 + 현재 발행 버전 갱신
3. assignment_batch 생성 + 모든 learner_assignment 생성
4. 제출 차수 확정 + 항목 잠금 + 카드 상태 변경 + 이벤트 생성
5. 재제출 요청 메시지 + 카드 상태 변경 + 이벤트 생성
6. 최종 승인 메시지 + 카드 완료 상태/시각 변경 + 이벤트 생성

Auth와 Postgres가 완전한 단일 트랜잭션을 공유하지 못하는 작업은 보상 작업과 운영 복구 절차를 둔다.

## 12. 테스트 데이터

개발 seed는 실제 개인정보를 사용하지 않는다.

### 계정

- 관리자 1명
- 활성 학생 4명
- 최초 비밀번호 변경 대상 학생 1명
- 비활성 학생 1명

### 그룹

- 초급반: 학생 3명
- 프로젝트반: 학생 2명
- 한 학생은 두 그룹에 중복 소속

### 모듈

- 초안 1개
- 발행 버전 1개인 모듈 1개
- 발행 버전 2개인 모듈 1개
- 보관 모듈 1개

### 배정 상태

- 시작 전
- 학습 중
- 수강 완료/미제출
- 제출/검토 대기
- 재제출 요청
- 재제출
- 최종 완료
- 중단

## 13. 데이터 검증 체크리스트

- [ ] 모든 사용자 FK가 Auth/프로필과 일치한다.
- [ ] role=student가 아닌 프로필을 그룹 구성원이나 배정 학생으로 넣을 수 없다.
- [ ] 발행된 버전을 수정·삭제할 수 없다.
- [ ] 그룹 구성 변경이 learner_assignments를 수정하지 않는다.
- [ ] 같은 배치에서 학생 중복 행이 생기지 않는다.
- [ ] 제출 차수는 카드별로 연속 증가한다.
- [ ] 제출된 항목은 수정되지 않는다.
- [ ] 피드백 종류와 작성자 역할이 일치한다.
- [ ] 최종 완료 상태와 completed_at이 일치한다.
- [ ] 학생 A의 SQL/SDK 요청으로 학생 B 데이터를 읽을 수 없다.
- [ ] 세 버킷 모두 private이다.
- [ ] service role 없이 Storage RLS가 의도대로 거부한다.
- [ ] 고아 파일을 식별할 수 있다.
- [ ] 활동 로그에 민감정보가 없다.

## 14. 미래 확장 영향

| 기능      | 새 데이터 영역                              | 기존 모델 연결                          |
| --------- | ------------------------------------------- | --------------------------------------- |
| 알림      | notification_preferences, notification_jobs | activity_events 또는 도메인 이벤트      |
| 일정      | sessions, attendance, reminders             | groups, learner_assignments             |
| 결제      | products, enrollments, payments, refunds    | profiles, groups                        |
| AI 피드백 | ai_feedback_runs, model_usage               | submissions, feedback_messages와 별도   |
| 다중 강사 | organizations, memberships                  | 거의 모든 핵심 테이블에 organization_id |

다중 강사는 데이터 경계 전체를 바꾸므로 단순 기능 플래그로 활성화하지 않는다.

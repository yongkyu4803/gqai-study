import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (process.env.SUPABASE_VERIFY_ALLOW_WRITE !== "true")
  throw new Error(
    "전용 로컬/테스트 프로젝트에서 SUPABASE_VERIFY_ALLOW_WRITE=true로 실행하세요.",
  );
if (!url || !publishable || !serviceRole)
  throw new Error("Supabase 검증 환경변수가 필요합니다.");

const service = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stamp = Date.now().toString(36);
const password = "Verify1234!";
const results = [];
function check(condition, name, detail = "") {
  if (!condition)
    throw new Error(`FAIL: ${name}${detail ? ` (${detail})` : ""}`);
  results.push({ name, status: "PASS", detail });
}
async function makeUser(loginId, displayName, role, createdBy) {
  const { data, error } = await service.auth.admin.createUser({
    email: `${loginId}@accounts.gqai.local`,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(error?.message || "Auth user creation failed");
  const { error: profileError } = await service.from("profiles").insert({
    id: data.user.id,
    role,
    login_id: loginId,
    display_name: displayName,
    must_change_password: false,
    is_active: true,
    created_by: createdBy,
  });
  if (profileError) throw profileError;
  return data.user.id;
}
async function signed(loginId) {
  const client = createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: `${loginId}@accounts.gqai.local`,
    password,
  });
  if (error) throw error;
  return client;
}

const adminLogin = `verify.admin.${stamp}`;
const adminId = await makeUser(adminLogin, "검증 강사", "admin", null);
const studentLogins = [0, 1, 2, 3].map(
  (index) => `verify.student${index}.${stamp}`,
);
const studentIds = [];
for (let index = 0; index < studentLogins.length; index += 1)
  studentIds.push(
    await makeUser(
      studentLogins[index],
      `검증 학생 ${index + 1}`,
      "student",
      adminId,
    ),
  );
const admin = await signed(adminLogin);
const students = await Promise.all(studentLogins.map(signed));
check(
  Boolean(adminId) && studentIds.length === 4,
  "관리자 발급 계정과 학생 계정 생성",
  "학생 4명",
);

const { data: group, error: groupError } = await admin
  .from("groups")
  .insert({ name: `검증 그룹 ${stamp}`, description: "그룹 배정 검증" })
  .select("id")
  .single();
if (groupError) throw groupError;
const { error: memberError } = await admin
  .from("group_members")
  .insert(
    studentIds
      .slice(0, 3)
      .map((studentId) => ({ group_id: group.id, student_id: studentId })),
  );
if (memberError) throw memberError;
check(Boolean(group.id), "그룹 생성과 초기 구성원 저장", "3명");

const firstSnapshot = {
  schemaVersion: 1,
  blocks: [{ id: "intro", type: "paragraph", text: "버전 1 학습 내용" }],
};
const { data: template, error: templateError } = await admin
  .from("module_templates")
  .insert({
    title: `검증 모듈 ${stamp}`,
    summary: "통합 검증",
    category: "검증",
    difficulty: "beginner",
    estimated_minutes: 20,
    tags: ["verify"],
    draft_content: firstSnapshot,
    draft_learning_objectives: ["개별 기록 확인"],
    draft_prerequisites: [],
    draft_submission_requirements: ["텍스트와 링크"],
    draft_completion_criteria: ["피드백 완료"],
  })
  .select("id")
  .single();
if (templateError) throw templateError;
const { error: unsafeDraftUpdateError } = await admin
  .from("module_templates")
  .update({
    draft_content: {
      schemaVersion: 1,
      blocks: [
        {
          id: "unsafe-module-link",
          type: "link",
          text: "잘못된 링크",
          url: "javascript:alert(1)",
        },
      ],
    },
  })
  .eq("id", template.id);
if (unsafeDraftUpdateError) throw unsafeDraftUpdateError;
const { error: unsafeModuleLinkError } = await admin.rpc(
  "publish_module_version",
  { p_module_id: template.id },
);
const { error: restoreDraftError } = await admin
  .from("module_templates")
  .update({ draft_content: firstSnapshot })
  .eq("id", template.id);
if (restoreDraftError) throw restoreDraftError;
const { data: versionOne, error: publishError } = await admin.rpc(
  "publish_module_version",
  { p_module_id: template.id },
);
if (publishError) throw publishError;
check(
  Boolean(unsafeModuleLinkError) && Boolean(versionOne),
  "모듈 URL 검증과 버전 1 발행",
);

const { data: batchId, error: assignError } = await admin.rpc("assign_module", {
  p_module_version_id: versionOne,
  p_target_kind: "group",
  p_student_ids: [],
  p_group_id: group.id,
  p_common_instruction: "그룹 공통 안내",
  p_idempotency_key: `verify-${stamp}`,
});
if (assignError) throw assignError;
const { data: assignedRows, error: rowsError } = await service
  .from("learner_assignments")
  .select("id, student_id, module_version_id")
  .eq("assignment_batch_id", batchId);
if (rowsError) throw rowsError;
check(
  assignedRows.length === 3 &&
    new Set(assignedRows.map((row) => row.student_id)).size === 3,
  "그룹 배정의 학생별 카드 분해",
  "정확히 3개",
);

const ownAssignment = assignedRows.find(
  (row) => row.student_id === studentIds[0],
);
const otherAssignment = assignedRows.find(
  (row) => row.student_id === studentIds[1],
);
const cancellableAssignment = assignedRows.find(
  (row) => row.student_id === studentIds[2],
);
const { data: visibleAssignments } = await students[0]
  .from("learner_assignments")
  .select("id");
const { data: foreignAssignment } = await students[0]
  .from("learner_assignments")
  .select("id")
  .eq("id", otherAssignment.id)
  .maybeSingle();
const { data: visibleProfiles } = await students[0]
  .from("profiles")
  .select("id");
check(
  visibleAssignments.length === 1 &&
    foreignAssignment === null &&
    visibleProfiles.length === 1,
  "RLS 학생 간 데이터 격리",
  "타 학생 카드와 프로필 0건",
);

const { error: instructionError } = await admin.rpc("manage_assignment", {
  p_assignment_id: otherAssignment.id,
  p_action: "set_instruction",
  p_instruction: "학생별 추가 안내",
});
if (instructionError) throw instructionError;
const { data: instructedAssignment } = await service
  .from("learner_assignments")
  .select("personal_instruction")
  .eq("id", otherAssignment.id)
  .single();
check(
  instructedAssignment.personal_instruction === "학생별 추가 안내",
  "배정 후 학생별 안내 수정",
);

const { error: cancelError } = await admin.rpc("manage_assignment", {
  p_assignment_id: cancellableAssignment.id,
  p_action: "cancel",
  p_instruction: null,
});
if (cancelError) throw cancelError;
const { error: beginOtherError } = await students[1].rpc(
  "update_learning_state",
  {
    p_assignment_id: otherAssignment.id,
    p_action: "start",
    p_note: null,
  },
);
if (beginOtherError) throw beginOtherError;
const { error: stopError } = await admin.rpc("manage_assignment", {
  p_assignment_id: otherAssignment.id,
  p_action: "stop",
  p_instruction: null,
});
if (stopError) throw stopError;
const { data: managedAssignments } = await service
  .from("learner_assignments")
  .select("id, assignment_status")
  .in("id", [cancellableAssignment.id, otherAssignment.id]);
check(
  managedAssignments.find((row) => row.id === cancellableAssignment.id)
    ?.assignment_status === "cancelled" &&
    managedAssignments.find((row) => row.id === otherAssignment.id)
      ?.assignment_status === "stopped",
  "활동 전 취소와 활동 후 중단 구분",
);

const { error: noteError } = await students[0].rpc("update_learning_state", {
  p_assignment_id: ownAssignment.id,
  p_action: "note",
  p_note: "학생만 보는 개인 메모",
});
if (noteError) throw noteError;
const { data: ownNotes } = await students[0]
  .from("student_notes")
  .select("note");
const { data: adminNotes } = await admin.from("student_notes").select("note");
check(
  ownNotes.length === 1 && adminNotes.length === 0,
  "학생 개인 메모 격리",
  "강사 조회 0건",
);

const { error: openError } = await students[0].rpc("update_learning_state", {
  p_assignment_id: ownAssignment.id,
  p_action: "start",
  p_note: null,
});
if (openError) throw openError;
const objectPath = `${studentIds[0]}/${ownAssignment.id}/draft/test-${stamp}.txt`;
const imagePath = `${studentIds[0]}/${ownAssignment.id}/draft/image-${stamp}.png`;
const { error: uploadError } = await students[0].storage
  .from("submission-assets")
  .upload(objectPath, new Blob(["private verification"]), {
    contentType: "text/plain",
  });
if (uploadError) throw uploadError;
const { error: imageUploadError } = await students[0].storage
  .from("submission-assets")
  .upload(imagePath, new Blob(["image verification"]), {
    contentType: "image/png",
  });
if (imageUploadError) throw imageUploadError;
const { error: unsafeSubmissionUrlError } = await students[0].rpc(
  "save_submission_draft",
  {
    p_assignment_id: ownAssignment.id,
    p_items: [
      {
        id: "unsafe-link",
        type: "link",
        order: 0,
        url: "javascript:alert(1)",
      },
    ],
    p_based_on_submission_id: null,
  },
);
const firstItems = [
  { id: "client-text", type: "text", order: 0, text: "첫 번째 결과" },
  {
    id: "client-link",
    type: "link",
    order: 1,
    url: "https://example.com/result",
  },
  {
    id: "client-image",
    type: "image",
    order: 2,
    asset: {
      storagePath: imagePath,
      name: `image-${stamp}.png`,
      mimeType: "image/png",
      size: 18,
    },
  },
  {
    id: "client-file",
    type: "file",
    order: 3,
    asset: {
      storagePath: objectPath,
      name: `test-${stamp}.txt`,
      mimeType: "text/plain",
      size: 20,
    },
  },
];
const { error: draftError } = await students[0].rpc("save_submission_draft", {
  p_assignment_id: ownAssignment.id,
  p_items: firstItems,
  p_based_on_submission_id: null,
});
if (draftError) throw draftError;
const { data: submissionOne, error: submitError } = await students[0].rpc(
  "submit_assignment",
  { p_assignment_id: ownAssignment.id },
);
if (submitError) throw submitError;
check(
  Boolean(unsafeSubmissionUrlError) && Boolean(submissionOne),
  "학생 학습 시작과 네 가지 혼합 제출·URL 검증",
  "텍스트+링크+이미지+파일",
);

const { error: foreignDownloadError } = await students[1].storage
  .from("submission-assets")
  .download(objectPath);
check(Boolean(foreignDownloadError), "비공개 파일의 타 학생 접근 차단");

const blockedObjectPath = `${studentIds[0]}/${ownAssignment.id}/draft/blocked-${stamp}.exe`;
const { error: blockedUploadError } = await students[0].storage
  .from("submission-assets")
  .upload(blockedObjectPath, new Blob(["blocked executable"]), {
    contentType: "application/octet-stream",
  });
check(Boolean(blockedUploadError), "Storage 정책의 실행 파일 업로드 차단");

const { data: revisionMessage, error: feedbackError } = await admin.rpc(
  "create_feedback_message",
  {
    p_assignment_id: ownAssignment.id,
    p_submission_id: submissionOne,
    p_kind: "revision_request",
    p_body: "한 단계 더 구체화해 주세요.",
    p_attachments: [],
  },
);
if (feedbackError) throw feedbackError;
const { data: studentFeedback } = await students[0]
  .from("feedback_messages")
  .select("id, kind")
  .eq("id", revisionMessage)
  .single();
check(
  studentFeedback?.kind === "revision_request",
  "강사 재제출 요청과 학생 조회",
);

const { error: replyError } = await students[0].rpc("create_feedback_message", {
  p_assignment_id: ownAssignment.id,
  p_submission_id: null,
  p_kind: "student_reply",
  p_body: "수정해서 다시 제출하겠습니다.",
  p_attachments: [],
});
if (replyError) throw replyError;
const secondItems = [
  { id: "client-text-2", type: "text", order: 0, text: "보완한 두 번째 결과" },
];
const { error: redraftError } = await students[0].rpc("save_submission_draft", {
  p_assignment_id: ownAssignment.id,
  p_items: secondItems,
  p_based_on_submission_id: submissionOne,
});
if (redraftError) throw redraftError;
const { data: submissionTwo, error: resubmitError } = await students[0].rpc(
  "submit_assignment",
  { p_assignment_id: ownAssignment.id },
);
if (resubmitError) throw resubmitError;
const { data: revisions } = await service
  .from("submissions")
  .select("revision_number, status")
  .eq("learner_assignment_id", ownAssignment.id)
  .order("revision_number");
check(
  revisions.length === 2 &&
    revisions[0].revision_number === 1 &&
    revisions[1].revision_number === 2,
  "재제출 시 이전 차수 보존",
  "1차+2차",
);

const { error: approveError } = await admin.rpc("create_feedback_message", {
  p_assignment_id: ownAssignment.id,
  p_submission_id: submissionTwo,
  p_kind: "final_approval",
  p_body: "최종 완료합니다.",
  p_attachments: [],
});
if (approveError) throw approveError;
const { data: completed } = await service
  .from("learner_assignments")
  .select("assignment_status, completed_at")
  .eq("id", ownAssignment.id)
  .single();
check(
  completed.assignment_status === "completed" &&
    Boolean(completed.completed_at),
  "강사 최종 완료 처리",
);

const { error: reopenError } = await admin.rpc("create_feedback_message", {
  p_assignment_id: ownAssignment.id,
  p_submission_id: submissionTwo,
  p_kind: "completion_reopened",
  p_body: "추가 확인을 위해 완료를 취소합니다.",
  p_attachments: [],
});
if (reopenError) throw reopenError;
const { data: reopened } = await service
  .from("learner_assignments")
  .select("assignment_status, completed_at")
  .eq("id", ownAssignment.id)
  .single();
check(
  reopened.assignment_status === "feedback_given" &&
    reopened.completed_at === null,
  "관리자 완료 취소와 감사 이력",
);
const { error: reapproveError } = await admin.rpc("create_feedback_message", {
  p_assignment_id: ownAssignment.id,
  p_submission_id: submissionTwo,
  p_kind: "final_approval",
  p_body: "검증 종료를 위해 다시 완료합니다.",
  p_attachments: [],
});
if (reapproveError) throw reapproveError;

await admin
  .from("group_members")
  .insert({ group_id: group.id, student_id: studentIds[3] });
const { count: historicCount } = await service
  .from("learner_assignments")
  .select("id", { count: "exact", head: true })
  .eq("assignment_batch_id", batchId);
check(
  historicCount === 3,
  "그룹 변경이 과거 배정에 미치는 영향 없음",
  "신규 구성원 자동 배정 안 됨",
);

await admin
  .from("module_templates")
  .update({
    title: `검증 모듈 v2 ${stamp}`,
    draft_content: {
      schemaVersion: 1,
      blocks: [{ id: "intro-v2", type: "paragraph", text: "버전 2 학습 내용" }],
    },
  })
  .eq("id", template.id);
const { data: versionTwo, error: secondPublishError } = await admin.rpc(
  "publish_module_version",
  { p_module_id: template.id },
);
if (secondPublishError) throw secondPublishError;
const { data: originalCard } = await service
  .from("learner_assignments")
  .select("module_version_id")
  .eq("id", ownAssignment.id)
  .single();
const { error: immutableError } = await service
  .from("module_versions")
  .update({ title_snapshot: "변조" })
  .eq("id", versionOne);
check(
  versionTwo !== versionOne &&
    originalCard.module_version_id === versionOne &&
    Boolean(immutableError),
  "발행 버전 고정과 불변성",
);

process.stdout.write(
  `${JSON.stringify({ status: "PASS", checks: results.length, results }, null, 2)}\n`,
);

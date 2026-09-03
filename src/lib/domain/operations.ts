import { nanoid } from "nanoid";
import type {
  AppState,
  AssignmentInput,
  AssignmentManagementAction,
  ContentBlock,
  FeedbackInput,
  ModuleSnapshot,
  SubmissionDraftInput,
} from "./types";
import {
  validateModuleSnapshot,
  validateSubmissionItems,
} from "./validation";

const copy = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

function event(
  state: AppState,
  input: {
    name: string;
    actorId?: string;
    studentId?: string;
    assignmentId?: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  state.activities.unshift({
    id: nanoid(),
    eventName: input.name,
    actorId: input.actorId,
    studentId: input.studentId,
    assignmentId: input.assignmentId,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
    createdAt: now(),
  });
}

function checksumSnapshot(snapshot: ModuleSnapshot) {
  let hash = 0;
  const value = JSON.stringify(snapshot);
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `snapshot-${Math.abs(hash)}`;
}

export function newBlankSnapshot(): ModuleSnapshot {
  return {
    title: "새 실습 모듈",
    summary: "",
    category: "미분류",
    difficulty: "beginner",
    estimatedMinutes: 30,
    tags: [],
    learningObjectives: [],
    prerequisites: [],
    submissionRequirements: [],
    completionCriteria: [],
    blocks: [
      {
        id: nanoid(),
        type: "heading",
        text: "오늘의 학습",
      },
      {
        id: nanoid(),
        type: "paragraph",
        text: "학습자가 수행할 내용을 작성하세요.",
      },
    ],
  };
}

export function newContentBlock(type: ContentBlock["type"]): ContentBlock {
  if (type === "divider") return { id: nanoid(), type };
  if (type === "checklist")
    return { id: nanoid(), type, text: "새 체크 항목", checked: false };
  if (type === "code")
    return { id: nanoid(), type, text: "", language: "text" };
  if (type === "link") return { id: nanoid(), type, text: "", url: "" };
  return { id: nanoid(), type, text: "" };
}

export function createDraftModule(state: AppState, adminId: string) {
  const next = copy(state);
  const stamp = now();
  const id = `module-${nanoid(10)}`;
  next.modules.unshift({
    id,
    status: "draft",
    draft: newBlankSnapshot(),
    createdBy: adminId,
    createdAt: stamp,
    updatedAt: stamp,
  });
  event(next, {
    name: "module.created",
    actorId: adminId,
    entityType: "module",
    entityId: id,
  });
  return { state: next, moduleId: id };
}

export function saveModuleDraft(
  state: AppState,
  moduleId: string,
  draft: ModuleSnapshot,
  actorId: string,
) {
  validateModuleSnapshot(draft);
  const next = copy(state);
  const template = next.modules.find((item) => item.id === moduleId);
  if (!template) throw new Error("모듈을 찾을 수 없습니다.");
  if (template.status === "archived")
    throw new Error("보관된 모듈은 수정할 수 없습니다.");
  template.draft = copy(draft);
  template.updatedAt = now();
  event(next, {
    name: "module.draft_saved",
    actorId,
    entityType: "module",
    entityId: moduleId,
  });
  return next;
}

export function publishModule(
  state: AppState,
  moduleId: string,
  adminId: string,
) {
  const next = copy(state);
  const template = next.modules.find((item) => item.id === moduleId);
  if (!template) throw new Error("모듈을 찾을 수 없습니다.");
  validateModuleSnapshot(template.draft, { forPublish: true });
  if (!template.draft.title.trim()) throw new Error("모듈 제목을 입력하세요.");
  if (
    !template.draft.blocks.some(
      (block) => block.text?.trim() || block.url?.trim() || block.asset,
    )
  )
    throw new Error("학습 내용을 한 개 이상 입력하세요.");

  const latest = next.versions
    .filter((version) => version.moduleTemplateId === moduleId)
    .reduce((max, version) => Math.max(max, version.versionNumber), 0);
  const versionId = `version-${nanoid(10)}`;
  const publishedAt = now();
  next.versions.push({
    id: versionId,
    moduleTemplateId: moduleId,
    versionNumber: latest + 1,
    snapshot: copy(template.draft),
    checksum: checksumSnapshot(template.draft),
    publishedBy: adminId,
    publishedAt,
  });
  template.currentVersionId = versionId;
  template.status = "active";
  template.updatedAt = publishedAt;
  event(next, {
    name: "module.published",
    actorId: adminId,
    entityType: "module",
    entityId: moduleId,
    metadata: { versionNumber: latest + 1 },
  });
  return { state: next, versionId };
}

export function duplicateModule(
  state: AppState,
  moduleId: string,
  adminId: string,
) {
  const source = state.modules.find((item) => item.id === moduleId);
  if (!source) throw new Error("모듈을 찾을 수 없습니다.");
  const next = copy(state);
  const id = `module-${nanoid(10)}`;
  const stamp = now();
  next.modules.unshift({
    id,
    status: "draft",
    draft: {
      ...copy(source.draft),
      title: `${source.draft.title} 복사본`,
      blocks: source.draft.blocks.map((block) => ({
        ...block,
        id: nanoid(),
      })),
    },
    createdBy: adminId,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return { state: next, moduleId: id };
}

export function archiveModule(
  state: AppState,
  moduleId: string,
  actorId: string,
) {
  const next = copy(state);
  const template = next.modules.find((item) => item.id === moduleId);
  if (!template) throw new Error("모듈을 찾을 수 없습니다.");
  template.status = template.status === "archived" ? "draft" : "archived";
  template.archivedAt = template.status === "archived" ? now() : undefined;
  template.updatedAt = now();
  event(next, {
    name:
      template.status === "archived" ? "module.archived" : "module.restored",
    actorId,
    entityType: "module",
    entityId: moduleId,
  });
  return next;
}

export function createAssignmentBatch(
  state: AppState,
  input: AssignmentInput,
  adminId: string,
) {
  const next = copy(state);
  const version = next.versions.find(
    (item) => item.id === input.moduleVersionId,
  );
  if (!version) throw new Error("발행된 모듈 버전을 선택하세요.");

  const sourceIds =
    input.targetKind === "group"
      ? (next.groups.find((group) => group.id === input.groupId)?.memberIds ??
        [])
      : input.studentIds;
  const uniqueIds = [...new Set(sourceIds)];
  const targets = next.profiles.filter(
    (profile) =>
      uniqueIds.includes(profile.id) &&
      profile.role === "student" &&
      profile.isActive,
  );
  if (!targets.length) throw new Error("배정할 활성 학생을 선택하세요.");

  const batchId = `batch-${nanoid(10)}`;
  const stamp = now();
  next.batches.unshift({
    id: batchId,
    moduleVersionId: input.moduleVersionId,
    targetKind: input.targetKind,
    sourceGroupId: input.targetKind === "group" ? input.groupId : undefined,
    commonInstruction: input.commonInstruction,
    targetSnapshot: targets.map((target) => ({
      id: target.id,
      displayName: target.displayName,
    })),
    recipientCount: targets.length,
    assignedBy: adminId,
    assignedAt: stamp,
  });

  const assignmentIds: string[] = [];
  for (const target of targets) {
    const id = `assignment-${nanoid(10)}`;
    assignmentIds.push(id);
    next.assignments.unshift({
      id,
      assignmentBatchId: batchId,
      moduleVersionId: input.moduleVersionId,
      studentId: target.id,
      sourceGroupId: input.targetKind === "group" ? input.groupId : undefined,
      personalInstruction: input.commonInstruction,
      learningStatus: "not_started",
      assignmentStatus: "not_submitted",
      studentNote: "",
      createdAt: stamp,
      updatedAt: stamp,
    });
    event(next, {
      name: "assignment.created",
      actorId: adminId,
      studentId: target.id,
      assignmentId: id,
      entityType: "assignment",
      entityId: id,
      metadata: { source: input.targetKind },
    });
  }
  return { state: next, batchId, assignmentIds };
}

export function manageAssignment(
  state: AppState,
  assignmentId: string,
  action: AssignmentManagementAction,
  actorId: string,
  instruction = "",
) {
  const next = copy(state);
  const assignment = next.assignments.find((item) => item.id === assignmentId);
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");

  const stamp = now();
  if (action === "set_instruction") {
    assignment.personalInstruction = instruction.trim().slice(0, 2000);
  } else {
    if (
      ["completed", "cancelled", "stopped"].includes(
        assignment.assignmentStatus,
      )
    )
      throw new Error("현재 상태에서는 변경할 수 없습니다.");
    const hasActivity = Boolean(
      assignment.firstOpenedAt ||
      assignment.startedAt ||
      assignment.courseCompletedAt ||
      next.submissions.some(
        (submission) =>
          submission.assignmentId === assignmentId &&
          submission.status !== "draft",
      ),
    );
    if (action === "cancel" && hasActivity)
      throw new Error("활동이 시작된 카드는 중단 처리하세요.");
    if (action === "stop" && !hasActivity)
      throw new Error("활동 전 카드는 취소 처리하세요.");
    assignment.assignmentStatus = action === "cancel" ? "cancelled" : "stopped";
  }

  assignment.updatedAt = stamp;
  assignment.lastActivityAt = stamp;
  event(next, {
    name:
      action === "set_instruction"
        ? "assignment.instruction_updated"
        : `assignment.${action === "cancel" ? "cancelled" : "stopped"}`,
    actorId,
    studentId: assignment.studentId,
    assignmentId,
    entityType: "assignment",
    entityId: assignmentId,
  });
  return next;
}

export function markAssignmentOpened(
  state: AppState,
  assignmentId: string,
  studentId: string,
) {
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === assignmentId && item.studentId === studentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  if (!assignment.firstOpenedAt) {
    const stamp = now();
    assignment.firstOpenedAt = stamp;
    assignment.lastActivityAt = stamp;
    assignment.updatedAt = stamp;
    event(next, {
      name: "assignment.opened",
      actorId: studentId,
      studentId,
      assignmentId,
      entityType: "assignment",
      entityId: assignmentId,
    });
  }
  return next;
}

export function updateLearning(
  state: AppState,
  assignmentId: string,
  studentId: string,
  action: "start" | "toggle_complete" | "note",
  note?: string,
) {
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === assignmentId && item.studentId === studentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  if (["cancelled", "stopped"].includes(assignment.assignmentStatus))
    throw new Error("진행할 수 없는 카드입니다.");
  const stamp = now();
  if (action === "start") {
    assignment.learningStatus = "in_progress";
    assignment.startedAt ||= stamp;
  }
  if (action === "toggle_complete") {
    const isComplete = assignment.learningStatus === "course_completed";
    assignment.learningStatus = isComplete ? "in_progress" : "course_completed";
    assignment.courseCompletedAt = isComplete ? undefined : stamp;
  }
  if (action === "note") assignment.studentNote = note ?? "";
  assignment.lastActivityAt = stamp;
  assignment.updatedAt = stamp;
  event(next, {
    name:
      action === "start"
        ? "learning.started"
        : action === "toggle_complete"
          ? "learning.course_status_changed"
          : "learning.note_saved",
    actorId: studentId,
    studentId,
    assignmentId,
    entityType: "assignment",
    entityId: assignmentId,
  });
  return next;
}

export function saveSubmissionDraft(
  state: AppState,
  input: SubmissionDraftInput,
  studentId: string,
) {
  validateSubmissionItems(input.items);
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === input.assignmentId && item.studentId === studentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  if (
    ["completed", "cancelled", "stopped"].includes(assignment.assignmentStatus)
  )
    throw new Error("제출할 수 없는 카드입니다.");
  const stamp = now();
  let draft = next.submissions.find(
    (item) =>
      item.assignmentId === input.assignmentId && item.status === "draft",
  );
  if (!draft) {
    draft = {
      id: `submission-${nanoid(10)}`,
      assignmentId: input.assignmentId,
      studentId,
      status: "draft",
      basedOnSubmissionId: input.basedOnSubmissionId,
      items: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    next.submissions.push(draft);
  }
  draft.items = copy(input.items);
  draft.basedOnSubmissionId = input.basedOnSubmissionId;
  draft.updatedAt = stamp;
  return { state: next, submissionId: draft.id };
}

export function submitDraft(
  state: AppState,
  assignmentId: string,
  studentId: string,
) {
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === assignmentId && item.studentId === studentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  if (
    ["completed", "cancelled", "stopped"].includes(assignment.assignmentStatus)
  )
    throw new Error("제출할 수 없는 카드입니다.");
  const draft = next.submissions.find(
    (item) => item.assignmentId === assignmentId && item.status === "draft",
  );
  if (!draft || !draft.items.length)
    throw new Error("제출 항목을 한 개 이상 추가하세요.");
  validateSubmissionItems(draft.items);
  const latestRevision = next.submissions
    .filter(
      (item) =>
        item.assignmentId === assignmentId &&
        typeof item.revisionNumber === "number",
    )
    .reduce((max, item) => Math.max(max, item.revisionNumber ?? 0), 0);
  const stamp = now();
  draft.revisionNumber = latestRevision + 1;
  draft.status = "submitted";
  draft.submittedAt = stamp;
  draft.updatedAt = stamp;
  for (const submission of next.submissions) {
    if (
      submission.assignmentId === assignmentId &&
      submission.id !== draft.id &&
      submission.status === "submitted"
    ) {
      submission.status = "superseded";
    }
  }
  assignment.assignmentStatus =
    latestRevision === 0 ? "submitted" : "resubmitted";
  assignment.lastActivityAt = stamp;
  assignment.updatedAt = stamp;
  event(next, {
    name: "submission.submitted",
    actorId: studentId,
    studentId,
    assignmentId,
    entityType: "submission",
    entityId: draft.id,
    metadata: { revisionNumber: latestRevision + 1 },
  });
  return { state: next, submissionId: draft.id };
}

export function createFeedback(
  state: AppState,
  input: FeedbackInput,
  actorId: string,
) {
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === input.assignmentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  const actor = next.profiles.find((profile) => profile.id === actorId);
  if (!actor) throw new Error("사용자 정보를 찾을 수 없습니다.");
  if (["cancelled", "stopped"].includes(assignment.assignmentStatus))
    throw new Error("종료된 카드에는 피드백을 추가할 수 없습니다.");
  if (
    assignment.assignmentStatus === "completed" &&
    input.kind !== "completion_reopened"
  )
    throw new Error("완료 취소를 먼저 선택하세요.");
  if (
    input.kind === "completion_reopened" &&
    assignment.assignmentStatus !== "completed"
  )
    throw new Error("완료된 카드만 완료 취소할 수 있습니다.");
  if (actor.role === "student" && input.kind !== "student_reply")
    throw new Error("학생은 답변만 작성할 수 있습니다.");
  if (actor.role === "admin" && input.kind === "student_reply")
    throw new Error("관리자 피드백 유형을 선택하세요.");
  if (
    actor.role === "admin" &&
    ["feedback", "revision_request", "final_approval"].includes(input.kind) &&
    !input.submissionId
  )
    throw new Error("검토할 제출 차수가 필요합니다.");
  if (input.kind === "revision_request" && !input.body.trim())
    throw new Error("재제출 요청 내용을 입력하세요.");
  if (input.kind === "completion_reopened" && !input.body.trim())
    throw new Error("완료 취소 사유를 입력하세요.");
  const stamp = now();
  const messageId = `feedback-${nanoid(10)}`;
  next.feedback.push({
    id: messageId,
    assignmentId: input.assignmentId,
    submissionId: input.submissionId,
    authorId: actorId,
    kind: input.kind,
    body: input.body.trim(),
    attachments: copy(input.attachments),
    readByStudentAt: actor.role === "student" ? stamp : undefined,
    createdAt: stamp,
  });

  if (input.kind === "feedback") assignment.assignmentStatus = "feedback_given";
  if (input.kind === "revision_request")
    assignment.assignmentStatus = "revision_requested";
  if (input.kind === "final_approval") {
    assignment.assignmentStatus = "completed";
    assignment.completedAt = stamp;
  }
  if (input.kind === "completion_reopened") {
    assignment.assignmentStatus = "feedback_given";
    assignment.completedAt = undefined;
  }
  assignment.lastActivityAt = stamp;
  assignment.updatedAt = stamp;
  event(next, {
    name:
      input.kind === "revision_request"
        ? "revision.requested"
        : input.kind === "final_approval"
          ? "assignment.completed"
          : "feedback.created",
    actorId,
    studentId: assignment.studentId,
    assignmentId: assignment.id,
    entityType: "feedback",
    entityId: messageId,
  });
  return { state: next, messageId };
}

export function markFeedbackRead(
  state: AppState,
  assignmentId: string,
  studentId: string,
) {
  const next = copy(state);
  const assignment = next.assignments.find(
    (item) => item.id === assignmentId && item.studentId === studentId,
  );
  if (!assignment) throw new Error("배정 카드를 찾을 수 없습니다.");
  const stamp = now();
  for (const message of next.feedback) {
    if (
      message.assignmentId === assignmentId &&
      message.authorId !== studentId &&
      !message.readByStudentAt
    ) {
      message.readByStudentAt = stamp;
    }
  }
  return next;
}

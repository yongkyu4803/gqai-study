import type {
  AssignmentStatus,
  Difficulty,
  FeedbackKind,
  LearningStatus,
  ModuleStatus,
} from "./types";

export const learningStatusLabel: Record<LearningStatus, string> = {
  not_started: "시작 전",
  in_progress: "학습 중",
  course_completed: "수강 완료",
};

export const assignmentStatusLabel: Record<AssignmentStatus, string> = {
  not_submitted: "미제출",
  submitted: "검토 대기",
  feedback_given: "피드백 도착",
  revision_requested: "재제출 필요",
  resubmitted: "재검토 대기",
  completed: "최종 완료",
  cancelled: "배정 취소",
  stopped: "학습 중단",
};

export const moduleStatusLabel: Record<ModuleStatus, string> = {
  draft: "작성 중",
  active: "사용 가능",
  archived: "보관",
};

export const difficultyLabel: Record<Difficulty, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "심화",
};

export const feedbackKindLabel: Record<FeedbackKind, string> = {
  feedback: "일반 피드백",
  revision_request: "재제출 요청",
  student_reply: "학생 답변",
  final_approval: "최종 완료",
  completion_reopened: "완료 취소",
};

export const studentPriority: Record<AssignmentStatus, number> = {
  revision_requested: 0,
  feedback_given: 1,
  not_submitted: 2,
  submitted: 3,
  resubmitted: 3,
  completed: 4,
  cancelled: 5,
  stopped: 5,
};

export function formatDate(value?: string, includeTime = false) {
  if (!value) return "— · 기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 필요";
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  });
  return formatter.format(date);
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "확인 필요";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

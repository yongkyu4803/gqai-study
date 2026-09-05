export type Role = "admin" | "student";
export type ModuleStatus = "draft" | "active" | "archived";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type LearningStatus = "not_started" | "in_progress" | "course_completed";
export type AssignmentStatus =
  | "not_submitted"
  | "submitted"
  | "feedback_given"
  | "revision_requested"
  | "resubmitted"
  | "completed"
  | "cancelled"
  | "stopped";
export type AssignmentManagementAction = "set_instruction" | "cancel" | "stop";
export type SubmissionStatus = "draft" | "submitted" | "superseded";
export type FeedbackKind =
  | "feedback"
  | "revision_request"
  | "student_reply"
  | "final_approval"
  | "completion_reopened";
export type BlockType =
  | "paragraph"
  | "heading"
  | "bullet_list"
  | "numbered_list"
  | "checklist"
  | "quote"
  | "divider"
  | "code"
  | "link"
  | "image"
  | "pdf"
  | "attachment";
export type SubmissionItemType = "text" | "link" | "image" | "file";

export interface Profile {
  id: string;
  role: Role;
  loginId: string;
  displayName: string;
  email?: string;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileAsset {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  storagePath?: string;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  text?: string;
  checked?: boolean;
  url?: string;
  language?: string;
  asset?: FileAsset;
}

export interface ModuleSnapshot {
  title: string;
  summary: string;
  category: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];
  submissionRequirements: string[];
  completionCriteria: string[];
  blocks: ContentBlock[];
}

export interface ModuleTemplate {
  id: string;
  status: ModuleStatus;
  draft: ModuleSnapshot;
  currentVersionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ModuleVersion {
  id: string;
  moduleTemplateId: string;
  versionNumber: number;
  snapshot: ModuleSnapshot;
  checksum: string;
  publishedBy: string;
  publishedAt: string;
}

export interface AssignmentBatch {
  sortOrder?: number;
  id: string;
  moduleVersionId: string;
  targetKind: "students" | "group";
  sourceGroupId?: string;
  commonInstruction: string;
  targetSnapshot: Array<{ id: string; displayName: string }>;
  recipientCount: number;
  assignedBy: string;
  assignedAt: string;
}

export interface LearnerAssignment {
  sortOrder?: number;
  id: string;
  assignmentBatchId: string;
  moduleVersionId: string;
  studentId: string;
  sourceGroupId?: string;
  personalInstruction: string;
  learningStatus: LearningStatus;
  assignmentStatus: AssignmentStatus;
  studentNote: string;
  firstOpenedAt?: string;
  startedAt?: string;
  courseCompletedAt?: string;
  lastActivityAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionItem {
  id: string;
  type: SubmissionItemType;
  order: number;
  text?: string;
  url?: string;
  asset?: FileAsset;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  revisionNumber?: number;
  status: SubmissionStatus;
  basedOnSubmissionId?: string;
  items: SubmissionItem[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackMessage {
  id: string;
  assignmentId: string;
  submissionId?: string;
  authorId: string;
  kind: FeedbackKind;
  body: string;
  attachments: FileAsset[];
  readByStudentAt?: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  eventName: string;
  actorId?: string;
  studentId?: string;
  assignmentId?: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface FeatureFlag {
  key: "notifications" | "schedule" | "payments" | "ai_feedback";
  enabled: boolean;
  visibility: "hidden" | "admin_preview" | "visible";
  description: string;
}

export interface AppState {
  profiles: Profile[];
  groups: Group[];
  modules: ModuleTemplate[];
  versions: ModuleVersion[];
  batches: AssignmentBatch[];
  assignments: LearnerAssignment[];
  submissions: Submission[];
  feedback: FeedbackMessage[];
  activities: ActivityEvent[];
  featureFlags: FeatureFlag[];
}

export interface SessionUser {
  id: string;
  role: Role;
  loginId: string;
  displayName: string;
  mustChangePassword: boolean;
}

export interface CreateStudentInput {
  displayName: string;
  loginId: string;
  password: string;
  email?: string;
  groupIds: string[];
}

export interface CreateGroupInput {
  name: string;
  description: string;
  memberIds: string[];
}

export interface AssignmentInput {
  moduleVersionId: string;
  targetKind: "students" | "group";
  studentIds: string[];
  groupId?: string;
  commonInstruction: string;
}

export interface SubmissionDraftInput {
  assignmentId: string;
  items: SubmissionItem[];
  basedOnSubmissionId?: string;
}

export interface FeedbackInput {
  assignmentId: string;
  submissionId?: string;
  kind: FeedbackKind;
  body: string;
  attachments: FileAsset[];
}

import type { AppState, ModuleSnapshot } from "@/lib/domain/types";
import notionModulesJson from "../../../content/notion-modules.json";

const adminId = "profile-admin";
const minjiId = "profile-minji";
const junhoId = "profile-junho";
const suyeonId = "profile-suyeon";

interface NotionModuleSeed {
  id: string;
  versionId: string;
  sourceDate: string;
  snapshot: ModuleSnapshot;
}

const notionModuleSeeds = notionModulesJson as NotionModuleSeed[];

export const demoCredentials: Record<string, string> = {
  admin: "admin1234",
  minji: "student1234",
  junho: "student1234",
  suyeon: "student1234",
};

export function createDemoSeed(): AppState {
  return {
    profiles: [
      {
        id: adminId,
        role: "admin",
        loginId: "admin",
        displayName: "박 강사",
        mustChangePassword: false,
        isActive: true,
        lastLoginAt: "2026-09-02T09:00:00.000Z",
        createdAt: "2026-08-01T09:00:00.000Z",
      },
      {
        id: minjiId,
        role: "student",
        loginId: "minji",
        displayName: "김민지",
        mustChangePassword: false,
        isActive: true,
        lastLoginAt: "2026-09-02T08:30:00.000Z",
        createdAt: "2026-08-10T09:00:00.000Z",
      },
      {
        id: junhoId,
        role: "student",
        loginId: "junho",
        displayName: "이준호",
        mustChangePassword: false,
        isActive: true,
        createdAt: "2026-08-12T09:00:00.000Z",
      },
      {
        id: suyeonId,
        role: "student",
        loginId: "suyeon",
        displayName: "최수연",
        mustChangePassword: true,
        isActive: true,
        createdAt: "2026-08-15T09:00:00.000Z",
      },
    ],
    groups: [
      {
        id: "group-beginner",
        name: "AI 입문반",
        description: "생성형 AI를 처음부터 차근차근 배우는 그룹",
        memberIds: [minjiId, junhoId, suyeonId],
        isArchived: false,
        createdAt: "2026-08-10T09:00:00.000Z",
        updatedAt: "2026-08-15T09:00:00.000Z",
      },
      {
        id: "group-project",
        name: "웹 프로젝트반",
        description: "작은 서비스를 직접 배포하는 실습 그룹",
        memberIds: [minjiId, junhoId],
        isArchived: false,
        createdAt: "2026-08-18T09:00:00.000Z",
        updatedAt: "2026-08-18T09:00:00.000Z",
      },
    ],
    modules: notionModuleSeeds.map((module) => ({
      id: module.id,
      status: "active",
      draft: structuredClone(module.snapshot),
      currentVersionId: module.versionId,
      createdBy: adminId,
      createdAt: `${module.sourceDate}T09:00:00.000Z`,
      updatedAt: `${module.sourceDate}T09:00:00.000Z`,
    })),
    versions: notionModuleSeeds.map((module) => ({
      id: module.versionId,
      moduleTemplateId: module.id,
      versionNumber: 1,
      snapshot: structuredClone(module.snapshot),
      checksum: `notion-ai-study-${module.sourceDate}`,
      publishedBy: adminId,
      publishedAt: `${module.sourceDate}T09:00:00.000Z`,
    })),
    batches: [
      {
        id: "batch-ai-beginner",
        moduleVersionId: "version-ai-friend-1",
        targetKind: "group",
        sourceGroupId: "group-beginner",
        commonInstruction: "첫 수업 전까지 편안하게 진행해 보세요.",
        targetSnapshot: [
          { id: minjiId, displayName: "김민지" },
          { id: junhoId, displayName: "이준호" },
          { id: suyeonId, displayName: "최수연" },
        ],
        recipientCount: 3,
        assignedBy: adminId,
        assignedAt: "2026-08-30T09:00:00.000Z",
      },
      {
        id: "batch-work-minji",
        moduleVersionId: "version-work-1",
        targetKind: "students",
        commonInstruction: "실제 뉴스 수집 업무를 사례로 적용해 주세요.",
        targetSnapshot: [{ id: minjiId, displayName: "김민지" }],
        recipientCount: 1,
        assignedBy: adminId,
        assignedAt: "2026-09-01T09:00:00.000Z",
      },
    ],
    assignments: [
      {
        id: "assignment-ai-minji",
        assignmentBatchId: "batch-ai-beginner",
        moduleVersionId: "version-ai-friend-1",
        studentId: minjiId,
        sourceGroupId: "group-beginner",
        personalInstruction: "",
        learningStatus: "course_completed",
        assignmentStatus: "feedback_given",
        studentNote: "대화 주제는 매일 하는 뉴스 정리 업무로 정했다.",
        firstOpenedAt: "2026-08-31T01:00:00.000Z",
        startedAt: "2026-08-31T01:02:00.000Z",
        courseCompletedAt: "2026-08-31T01:42:00.000Z",
        lastActivityAt: "2026-09-02T02:00:00.000Z",
        createdAt: "2026-08-30T09:00:00.000Z",
        updatedAt: "2026-09-02T02:00:00.000Z",
      },
      {
        id: "assignment-ai-junho",
        assignmentBatchId: "batch-ai-beginner",
        moduleVersionId: "version-ai-friend-1",
        studentId: junhoId,
        sourceGroupId: "group-beginner",
        personalInstruction: "",
        learningStatus: "in_progress",
        assignmentStatus: "not_submitted",
        studentNote: "",
        firstOpenedAt: "2026-09-01T03:00:00.000Z",
        startedAt: "2026-09-01T03:01:00.000Z",
        lastActivityAt: "2026-09-01T03:01:00.000Z",
        createdAt: "2026-08-30T09:00:00.000Z",
        updatedAt: "2026-09-01T03:01:00.000Z",
      },
      {
        id: "assignment-ai-suyeon",
        assignmentBatchId: "batch-ai-beginner",
        moduleVersionId: "version-ai-friend-1",
        studentId: suyeonId,
        sourceGroupId: "group-beginner",
        personalInstruction: "",
        learningStatus: "not_started",
        assignmentStatus: "not_submitted",
        studentNote: "",
        createdAt: "2026-08-30T09:00:00.000Z",
        updatedAt: "2026-08-30T09:00:00.000Z",
      },
      {
        id: "assignment-work-minji",
        assignmentBatchId: "batch-work-minji",
        moduleVersionId: "version-work-1",
        studentId: minjiId,
        personalInstruction:
          "지금 실제로 하는 업무를 기준으로 세밀하게 적어주세요.",
        learningStatus: "in_progress",
        assignmentStatus: "revision_requested",
        studentNote: "",
        firstOpenedAt: "2026-09-01T10:00:00.000Z",
        startedAt: "2026-09-01T10:02:00.000Z",
        lastActivityAt: "2026-09-02T04:20:00.000Z",
        createdAt: "2026-09-01T09:00:00.000Z",
        updatedAt: "2026-09-02T04:20:00.000Z",
      },
    ],
    submissions: [
      {
        id: "submission-ai-minji-1",
        assignmentId: "assignment-ai-minji",
        studentId: minjiId,
        revisionNumber: 1,
        status: "submitted",
        items: [
          {
            id: "item-ai-text",
            type: "text",
            order: 0,
            text: "뉴스 정리 자동화를 주제로 35분 동안 대화했습니다. 검색 범위를 먼저 정해야 한다는 점을 배웠습니다.",
          },
          {
            id: "item-ai-link",
            type: "link",
            order: 1,
            url: "https://example.com/ai-study-note",
          },
        ],
        submittedAt: "2026-08-31T01:50:00.000Z",
        createdAt: "2026-08-31T01:45:00.000Z",
        updatedAt: "2026-08-31T01:50:00.000Z",
      },
      {
        id: "submission-work-minji-1",
        assignmentId: "assignment-work-minji",
        studentId: minjiId,
        revisionNumber: 1,
        status: "submitted",
        items: [
          {
            id: "item-work-text",
            type: "text",
            order: 0,
            text: "기사 검색 → 링크 복사 → 본문 열기 → 핵심 문장 복사 → 문서에 붙여넣기 → 요약 요청 → 결과 검토 순서로 나눴습니다.",
          },
        ],
        submittedAt: "2026-09-02T03:00:00.000Z",
        createdAt: "2026-09-02T02:40:00.000Z",
        updatedAt: "2026-09-02T03:00:00.000Z",
      },
    ],
    feedback: [
      {
        id: "feedback-ai-minji",
        assignmentId: "assignment-ai-minji",
        submissionId: "submission-ai-minji-1",
        authorId: adminId,
        kind: "feedback",
        body: "대화 주제를 실제 업무와 연결한 점이 좋습니다. 다음 과제에서는 검색 결과를 판단하는 기준도 적어보세요.",
        attachments: [],
        createdAt: "2026-09-02T02:00:00.000Z",
      },
      {
        id: "feedback-work-minji",
        assignmentId: "assignment-work-minji",
        submissionId: "submission-work-minji-1",
        authorId: adminId,
        kind: "revision_request",
        body: "각 단계에 걸리는 시간과 반복 횟수를 추가하고, 가장 먼저 자동화할 한 단계를 선택해 주세요.",
        attachments: [],
        createdAt: "2026-09-02T04:20:00.000Z",
      },
    ],
    activities: [],
    featureFlags: [
      {
        key: "notifications",
        enabled: false,
        visibility: "admin_preview",
        description: "이메일·카카오 알림 연결 위치",
      },
      {
        key: "schedule",
        enabled: false,
        visibility: "admin_preview",
        description: "수업 일정과 출석 관리 연결 위치",
      },
      {
        key: "payments",
        enabled: false,
        visibility: "admin_preview",
        description: "결제와 수강권 연결 위치",
      },
      {
        key: "ai_feedback",
        enabled: false,
        visibility: "admin_preview",
        description: "AI 보조 피드백 연결 위치",
      },
    ],
  };
}

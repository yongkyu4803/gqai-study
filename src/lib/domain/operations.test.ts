import { describe, expect, it } from "vitest";
import { createDemoSeed } from "@/lib/demo/seed";
import {
  createAssignmentBatch,
  manageAssignment,
  markAssignmentOpened,
  publishModule,
  saveModuleDraft,
  saveSubmissionDraft,
  submitDraft,
} from "./operations";

describe("domain operations", () => {
  it("그룹 배정은 활성 구성원별 카드를 생성한다", () => {
    const state = createDemoSeed();
    const result = createAssignmentBatch(
      state,
      {
        moduleVersionId: "version-ai-friend-1",
        targetKind: "group",
        studentIds: [],
        groupId: "group-beginner",
        commonInstruction: "함께 시작합니다.",
      },
      "profile-admin",
    );

    expect(result.assignmentIds).toHaveLength(3);
    expect(
      result.state.assignments.filter(
        (assignment) => assignment.assignmentBatchId === result.batchId,
      ),
    ).toHaveLength(3);
  });

  it("원본 수정은 이미 발행된 버전을 바꾸지 않는다", () => {
    const state = createDemoSeed();
    const originalTitle = state.versions[0].snapshot.title;
    const edited = structuredClone(state.modules[0].draft);
    edited.title = "수정된 제목";
    const saved = saveModuleDraft(
      state,
      "module-ai-friend",
      edited,
      "profile-admin",
    );

    expect(saved.versions[0].snapshot.title).toBe(originalTitle);
    const published = publishModule(saved, "module-ai-friend", "profile-admin");
    expect(published.state.versions).toHaveLength(state.versions.length + 1);
    expect(published.state.versions[0].snapshot.title).toBe(originalTitle);
  });

  it("모듈과 제출 링크에서 실행 가능한 URL 스킴을 거부한다", () => {
    const state = createDemoSeed();
    const edited = structuredClone(state.modules[0].draft);
    edited.blocks.push({
      id: "unsafe-module-link",
      type: "link",
      text: "안전하지 않은 링크",
      url: "javascript:alert(1)",
    });

    expect(() =>
      saveModuleDraft(state, "module-ai-friend", edited, "profile-admin"),
    ).toThrow("http 또는 https");
    expect(() =>
      saveSubmissionDraft(
        state,
        {
          assignmentId: "assignment-work-minji",
          items: [
            {
              id: "unsafe-submission-link",
              type: "link",
              order: 0,
              url: "data:text/html,unsafe",
            },
          ],
        },
        "profile-minji",
      ),
    ).toThrow("http 또는 https");
  });

  it("재제출은 이전 제출을 보존하고 차수를 증가시킨다", () => {
    const state = createDemoSeed();
    const draft = saveSubmissionDraft(
      state,
      {
        assignmentId: "assignment-work-minji",
        basedOnSubmissionId: "submission-work-minji-1",
        items: [
          {
            id: "new-item",
            type: "text",
            order: 0,
            text: "수정한 결과",
          },
        ],
      },
      "profile-minji",
    );
    const submitted = submitDraft(
      draft.state,
      "assignment-work-minji",
      "profile-minji",
    );
    const revisions = submitted.state.submissions
      .filter((item) => item.assignmentId === "assignment-work-minji")
      .map((item) => item.revisionNumber)
      .sort();

    expect(revisions).toEqual([1, 2]);
    expect(
      submitted.state.submissions.find(
        (item) => item.id === "submission-work-minji-1",
      )?.status,
    ).toBe("superseded");
  });

  it("활동 전 카드는 취소하고 활동 후 카드는 중단한다", () => {
    const created = createAssignmentBatch(
      createDemoSeed(),
      {
        moduleVersionId: "version-ai-friend-1",
        targetKind: "students",
        studentIds: ["profile-junho", "profile-suyeon"],
        commonInstruction: "개별 안내",
      },
      "profile-admin",
    );
    const [cancelId, stopId] = created.assignmentIds;
    const instructed = manageAssignment(
      created.state,
      cancelId,
      "set_instruction",
      "profile-admin",
      "수정한 안내",
    );
    const cancelled = manageAssignment(
      instructed,
      cancelId,
      "cancel",
      "profile-admin",
    );
    const opened = markAssignmentOpened(cancelled, stopId, "profile-suyeon");
    const stopped = manageAssignment(opened, stopId, "stop", "profile-admin");

    expect(
      stopped.assignments.find((item) => item.id === cancelId)
        ?.personalInstruction,
    ).toBe("수정한 안내");
    expect(
      stopped.assignments.find((item) => item.id === cancelId)
        ?.assignmentStatus,
    ).toBe("cancelled");
    expect(
      stopped.assignments.find((item) => item.id === stopId)?.assignmentStatus,
    ).toBe("stopped");
  });
});

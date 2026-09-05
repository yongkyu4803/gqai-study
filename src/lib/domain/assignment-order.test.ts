import { describe, expect, it } from "vitest";
import { createDemoSeed } from "@/lib/demo/seed";
import { compareAssignmentOrder, reorderAssignments } from "./assignment-order";

describe("assignment order", () => {
  it("persists the requested student order without changing another student's cards", () => {
    const state = createDemoSeed();
    const studentId = state.assignments[0].studentId;
    const ids = state.assignments.filter((a) => a.studentId === studentId).map((a) => a.id).reverse();
    const next = reorderAssignments(state, "student", studentId, ids);
    expect(next.assignments.filter((a) => a.studentId === studentId).sort(compareAssignmentOrder).map((a) => a.id)).toEqual(ids);
    expect(next.assignments.filter((a) => a.studentId !== studentId)).toEqual(state.assignments.filter((a) => a.studentId !== studentId));
    expect(state.assignments.every((a) => a.sortOrder === undefined)).toBe(true);
  });

  it("rejects duplicate, missing and unrelated cards", () => {
    const state = createDemoSeed();
    const studentId = state.assignments[0].studentId;
    const ids = state.assignments.filter((a) => a.studentId === studentId).map((a) => a.id);
    for (const invalid of [[], ids.slice(1), [...ids, ids[0]], [...ids.slice(1), "unknown"]]) {
      expect(() => reorderAssignments(state, "student", studentId, invalid)).toThrow();
    }
  });

  it("applies group order to every recipient, including former members", () => {
    const state = createDemoSeed();
    const groupId = state.batches.find((b) => b.sourceGroupId)!.sourceGroupId!;
    const ids = state.batches.filter((b) => b.sourceGroupId === groupId).map((b) => b.id).reverse();
    const next = reorderAssignments(state, "group", groupId, ids);
    for (const assignment of next.assignments) {
      if (ids.includes(assignment.assignmentBatchId)) {
        expect(assignment.sortOrder).toBe(ids.indexOf(assignment.assignmentBatchId));
      } else expect(assignment).toEqual(state.assignments.find((a) => a.id === assignment.id));
    }
  });

  it("places newly assigned cards after the saved order", () => {
    expect([{ id: "new" }, { id: "second", sortOrder: 1 }, { id: "first", sortOrder: 0 }].sort(compareAssignmentOrder).map((a) => a.id)).toEqual(["first", "second", "new"]);
  });
});

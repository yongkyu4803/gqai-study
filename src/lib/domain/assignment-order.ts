import type { AppState } from "./types";

export function compareAssignmentOrder(
  a: {
    sortOrder?: number;
    id: string;
    createdAt?: string;
    assignedAt?: string;
  },
  b: {
    sortOrder?: number;
    id: string;
    createdAt?: string;
    assignedAt?: string;
  },
) {
  return (
    (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
    (a.createdAt ?? a.assignedAt ?? "").localeCompare(
      b.createdAt ?? b.assignedAt ?? "",
    ) ||
    a.id.localeCompare(b.id)
  );
}

export function reorderAssignments(
  state: AppState,
  kind: "student" | "group",
  targetId: string,
  ids: string[],
): AppState {
  const rows =
    kind === "student"
      ? state.assignments.filter((a) => a.studentId === targetId)
      : state.batches.filter((b) => b.sourceGroupId === targetId);
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    rows.length !== ids.length ||
    rows.some((r) => !ids.includes(r.id))
  ) {
    throw new Error(
      "カード一覧が変わりました。再読み込みしてやり直してください。",
    );
  }
  const positions = new Map(ids.map((id, index) => [id, index]));
  return {
    ...state,
    batches: state.batches.map((b) =>
      kind === "group" && positions.has(b.id)
        ? { ...b, sortOrder: positions.get(b.id) }
        : b,
    ),
    assignments: state.assignments.map((a) => {
      const key = kind === "group" ? a.assignmentBatchId : a.id;
      return positions.has(key) ? { ...a, sortOrder: positions.get(key) } : a;
    }),
  };
}

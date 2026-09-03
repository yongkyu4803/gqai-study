import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider, useApp } from "@/components/providers/app-provider";

// Node's built-in `localStorage` global (available since Node 22) requires a
// backing file and throws otherwise; jsdom's window.localStorage is shadowed
// by it in this test environment, so the demo persistence path needs an
// in-memory stand-in.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
});

type App = ReturnType<typeof useApp>;

function Harness({ onReady }: { onReady: (app: App) => void }) {
  const app = useApp();
  onReady(app);
  return null;
}

// Regression test for a bug where a multi-module assignment UI called the
// single-batch `assign` once per selected module inside a loop: each call
// closed over the same pre-loop React state, so every batch after the first
// silently overwrote the ones before it and only the last module ended up
// assigned.
describe("assignMany", () => {
  it("creates one batch per selected module instead of only the last one", async () => {
    let app!: App;
    render(
      <AppProvider>
        <Harness onReady={(value) => (app = value)} />
      </AppProvider>,
    );

    await waitFor(() => expect(app.ready).toBe(true));

    await act(async () => {
      await app.login("admin", "admin1234");
    });
    await waitFor(() => expect(app.session?.role).toBe("admin"));

    const moduleVersionIds = app.state.modules
      .filter((item) => item.status === "active" && item.currentVersionId)
      .slice(0, 2)
      .map((item) => item.currentVersionId!);
    expect(moduleVersionIds).toHaveLength(2);

    const student = app.state.profiles.find(
      (item) => item.role === "student" && item.isActive,
    )!;
    const batchCountBefore = app.state.batches.length;
    const assignmentIdsBefore = new Set(
      app.state.assignments.map((item) => item.id),
    );

    let result!: { createdCount: number; failedCount: number };
    await act(async () => {
      result = await app.assignMany(
        moduleVersionIds.map((moduleVersionId) => ({
          moduleVersionId,
          targetKind: "students" as const,
          studentIds: [student.id],
          commonInstruction: "",
        })),
      );
    });

    expect(result).toEqual({ createdCount: 2, failedCount: 0 });
    expect(app.state.batches.length - batchCountBefore).toBe(2);
    const created = app.state.assignments.filter(
      (item) => !assignmentIdsBefore.has(item.id),
    );
    expect(created).toHaveLength(2);
    expect(created.every((item) => item.studentId === student.id)).toBe(true);
    expect(
      new Set(created.map((item) => item.moduleVersionId)).size,
    ).toBe(2);
  });
});

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentOrderControls } from "./assignment-order-controls";

const { reorder, error } = vi.hoisted(() => ({
  reorder: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/components/providers/app-provider", () => ({
  useApp: () => ({ reorderAssignments: reorder }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error } }));

function setup() {
  const result = render(
    <AssignmentOrderControls
      kind="student"
      targetId="student"
      rows={[
        { id: "a", title: "첫 카드" },
        { id: "b", title: "둘째 카드" },
        { id: "c", title: "셋째 카드" },
      ]}
    >
      {["a", "b", "c"].map((id) => (
        <a key={id} href={`/${id}`}>
          {id} 본문
        </a>
      ))}
    </AssignmentOrderControls>,
  );
  result.container
    .querySelectorAll("[data-sortable-card]")
    .forEach((element, index) => {
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
        top: 100 + index * 60,
        height: 60,
      } as DOMRect);
    });
  return screen.getByRole("button", { name: "첫 카드 순서 이동" });
}

beforeEach(() => {
  vi.clearAllMocks();
  reorder.mockResolvedValue(undefined);
  vi.stubGlobal("PointerEvent", MouseEvent);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("direct card sorting", () => {
  it.each(["mouse", "touch"])(
    "moves a card across multiple positions with %s",
    async (pointerType) => {
      const handle = setup();
      fireEvent.pointerDown(handle, { button: 0, clientY: 120, pointerType });
      fireEvent.pointerMove(handle, { clientY: 290, pointerType });
      fireEvent.pointerUp(handle, { clientY: 290, pointerType });
      await waitFor(() =>
        expect(reorder).toHaveBeenCalledWith("student", "student", [
          "b",
          "c",
          "a",
        ]),
      );
      expect(screen.getByRole("link", { name: "a 본문" })).toHaveAttribute(
        "href",
        "/a",
      );
    },
  );
  it("does not save on a click or cancelled drag", () => {
    const handle = setup();
    fireEvent.pointerDown(handle, { button: 0, clientY: 120 });
    fireEvent.pointerUp(handle, { clientY: 120 });
    fireEvent.pointerDown(handle, { button: 0, clientY: 120 });
    fireEvent.pointerMove(handle, { clientY: 290 });
    fireEvent.keyDown(handle, { key: "Escape" });
    fireEvent.pointerUp(handle, { clientY: 290 });
    expect(reorder).not.toHaveBeenCalled();
  });
  it("supports keyboard movement and reports save failures", async () => {
    reorder.mockRejectedValueOnce(new Error("저장 실패"));
    fireEvent.keyDown(setup(), { key: "ArrowDown" });
    await waitFor(() => expect(error).toHaveBeenCalledWith("저장 실패"));
    expect(reorder).toHaveBeenCalledWith("student", "student", ["b", "a", "c"]);
    expect(
      screen.getByRole("button", { name: "첫 카드 순서 이동" }),
    ).toBeEnabled();
  });
});

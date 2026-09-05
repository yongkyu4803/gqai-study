import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncementsPanel } from "./announcements-panel";

const app = vi.hoisted(() => ({
  session: { id: "student", role: "admin" },
  state: { groups: [], announcements: [{ id: "notice", scope: "student", targetId: "student", title: "개별 안내", body: "안내 내용", archived: false, createdAt: "2026-09-05", updatedAt: "2026-09-05" }] },
  saveAnnouncement: vi.fn(),
}));
vi.mock("@/components/providers/app-provider", () => ({ useApp: () => app }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); app.session.role = "admin"; });

describe("announcement panel", () => {
  it("saves the notice to the current group without asking for a target", async () => {
    render(<AnnouncementsPanel scope="group" targetId="group" />);
    fireEvent.click(screen.getByRole("button", { name: "공지 작성" }));
    fireEvent.change(screen.getByLabelText("공지 제목"), { target: { value: "수업 안내" } });
    fireEvent.change(screen.getByLabelText("공지 내용"), { target: { value: "다음 시간 준비물" } });
    fireEvent.click(screen.getByRole("button", { name: "공지 저장" }));
    await waitFor(() => expect(app.saveAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ scope: "group", targetId: "group", title: "수업 안내", body: "다음 시간 준비물" })));
    await waitFor(() => expect(screen.queryByLabelText("공지 제목")).not.toBeInTheDocument());
  });
  it("shows students notices without authoring controls", () => {
    app.session.role = "student";
    render(<AnnouncementsPanel />);
    expect(screen.getByText("개별 안내")).toBeVisible();
    expect(screen.getByText("안내 내용")).not.toBeVisible();
    const row = screen.getByText("개별 안내").closest("details")!;
    row.open = true;
    expect(screen.getByText("안내 내용")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("keeps the draft when saving fails", async () => {
    app.saveAnnouncement.mockRejectedValueOnce(new Error("연결 실패"));
    render(<AnnouncementsPanel scope="all" />);
    fireEvent.click(screen.getByRole("button", { name: "공지 작성" }));
    fireEvent.change(screen.getByLabelText("공지 제목"), { target: { value: "전체 안내" } });
    fireEvent.change(screen.getByLabelText("공지 내용"), { target: { value: "안내 내용" } });
    fireEvent.click(screen.getByRole("button", { name: "공지 저장" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("연결 실패"));
    expect(screen.getByLabelText("공지 제목")).toHaveValue("전체 안내");
  });
});

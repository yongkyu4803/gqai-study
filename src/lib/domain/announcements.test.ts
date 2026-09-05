import { describe, expect, it } from "vitest";
import { createDemoSeed } from "@/lib/demo/seed";
import { studentAnnouncements, validateAnnouncement } from "./announcements";

describe("announcements", () => {
  it("shows only global, own and current group notices and excludes hidden notices", () => {
    const state = createDemoSeed();
    const group = state.groups[0];
    const studentId = group.memberIds[0];
    const base = { title: "공지", body: "내용", archived: false, createdAt: "2026-09-05", updatedAt: "2026-09-05" };
    state.announcements = [
      { ...base, id: "all", scope: "all" },
      { ...base, id: "own", scope: "student", targetId: studentId },
      { ...base, id: "other", scope: "student", targetId: "other" },
      { ...base, id: "group", scope: "group", targetId: group.id },
      { ...base, id: "hidden", scope: "all", archived: true },
    ];
    expect(studentAnnouncements(state, studentId).map((n) => n.id)).toEqual(["all", "own", "group"]);
    group.memberIds = [];
    expect(studentAnnouncements(state, studentId).map((n) => n.id)).toEqual(["all", "own"]);
  });
  it("rejects blank content and invalid targets", () => {
    expect(() => validateAnnouncement({ scope: "all", title: " ", body: "내용" })).toThrow();
    expect(() => validateAnnouncement({ scope: "student", title: "공지", body: "내용" })).toThrow();
    expect(() => validateAnnouncement({ scope: "all", targetId: "other", title: "공지", body: "내용" })).toThrow();
    expect(validateAnnouncement({ scope: "all", title: " 공지 ", body: " 내용 " }).title).toBe("공지");
  });
  it("supports older saved demo data without announcements", () => {
    expect(studentAnnouncements(createDemoSeed(), "student")).toEqual([]);
  });
});

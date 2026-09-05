import { describe, expect, it } from "vitest";
import { createDemoSeed } from "@/lib/demo/seed";
import { isNewAnnouncement, studentAnnouncements, validateAnnouncement } from "./announcements";

describe("announcements", () => {
  it("shows NEW for 72 hours from creation, excluding future and invalid dates", () => {
    const createdAt = "2026-09-05T09:00:00+09:00";
    const created = Date.parse(createdAt);
    expect(isNewAnnouncement(createdAt, created)).toBe(true);
    expect(isNewAnnouncement(createdAt, created + 72 * 60 * 60 * 1000 - 1)).toBe(true);
    expect(isNewAnnouncement(createdAt, created + 72 * 60 * 60 * 1000)).toBe(false);
    expect(isNewAnnouncement(createdAt, created - 1)).toBe(false);
    expect(isNewAnnouncement("invalid", created)).toBe(false);
  });
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

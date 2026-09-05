import type { Announcement, AppState } from "./types";

export type AnnouncementInput = Pick<
  Announcement,
  "scope" | "targetId" | "title" | "body"
> & { id?: string; archived?: boolean };

export function validateAnnouncement(input: AnnouncementInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 150)
    throw new Error("제목은 1~150자로 입력하세요.");
  if (!body || body.length > 5000)
    throw new Error("내용은 1~5,000자로 입력하세요.");
  if (
    !["all", "student", "group"].includes(input.scope) ||
    (input.scope === "all" ? !!input.targetId : !input.targetId)
  )
    throw new Error("공지 대상을 확인하세요.");
  return { ...input, title, body };
}

export function studentAnnouncements(state: AppState, studentId: string) {
  return (state.announcements ?? [])
    .filter(
      (notice) =>
        !notice.archived &&
        (notice.scope === "all" ||
          (notice.scope === "student" && notice.targetId === studentId) ||
          (notice.scope === "group" &&
            state.groups.some(
              (group) =>
                group.id === notice.targetId &&
                group.memberIds.includes(studentId),
            ))),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

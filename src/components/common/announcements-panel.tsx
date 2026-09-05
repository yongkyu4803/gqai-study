"use client";

import { useId, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { studentAnnouncements } from "@/lib/domain/announcements";
import type { Announcement } from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/status";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AnnouncementsPanel({
  scope,
  targetId,
}: {
  scope?: Announcement["scope"];
  targetId?: string;
}) {
  const { state, session, saveAnnouncement } = useApp();
  const formId = useId();
  const admin = session?.role === "admin" && !!scope;
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const notices = admin
    ? (state.announcements ?? [])
        .filter((n) => n.scope === scope && n.targetId === targetId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : studentAnnouncements(state, session?.id ?? "");
  const label =
    scope === "all"
      ? "전체 공지사항"
      : scope === "student"
        ? "학생 개별 공지사항"
        : scope === "group"
          ? "그룹 공지사항"
          : "공지사항";
  function edit(notice?: Announcement) {
    setEditing(notice?.id ?? "new");
    setTitle(notice?.title ?? "");
    setBody(notice?.body ?? "");
    setError("");
  }
  async function submit(notice?: Announcement) {
    if (!scope || pending) return;
    setPending(true);
    setError("");
    try {
      await saveAnnouncement(
        notice
          ? { ...notice, archived: !notice.archived }
          : {
              id: editing === "new" ? undefined : (editing ?? undefined),
              scope,
              targetId,
              title,
              body,
              archived:
                notices.find((n) => n.id === editing)?.archived ?? false,
            },
      );
      if (!notice) setEditing(null);
      toast.success(
        notice
          ? notice.archived
            ? "공지를 다시 게시했습니다."
            : "공지를 숨겼습니다."
          : "공지를 저장했습니다.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "공지를 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4" />
          {label}
        </CardTitle>
        {admin ? (
          <>
            <CardDescription>
              {scope === "all"
                ? "모든 학생에게 표시됩니다."
                : scope === "student"
                  ? "이 학생에게만 표시됩니다."
                  : "이 그룹의 현재 구성원에게 표시됩니다. 구성원 변경 시 열람 대상도 바뀝니다."}
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || editing !== null}
                onClick={() => edit()}
              >
                <Plus />
                공지 작성
              </Button>
            </CardAction>
          </>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing !== null ? (
          <form
            className="space-y-3 rounded-lg border bg-zinc-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`${formId}-title`}>공지 제목</Label>
              <Input
                id={`${formId}-title`}
                autoFocus
                required
                maxLength={150}
                value={title}
                disabled={pending}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-body`}>공지 내용</Label>
              <Textarea
                id={`${formId}-body`}
                required
                maxLength={5000}
                rows={5}
                value={body}
                disabled={pending}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중…" : "공지 저장"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              >
                취소
              </Button>
            </div>
          </form>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notices.length ? (
          notices.map((notice) => (
            <article
              key={notice.id}
              className={`space-y-2 rounded-lg border p-4 ${notice.archived ? "bg-zinc-50 text-muted-foreground" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {notice.scope === "all"
                    ? "전체"
                    : notice.scope === "student"
                      ? "개별"
                      : (state.groups.find((g) => g.id === notice.targetId)
                          ?.name ?? "그룹")}
                </Badge>
                {notice.archived ? <Badge variant="outline">숨김</Badge> : null}
                <span className="text-xs text-muted-foreground">
                  {formatDate(notice.createdAt)}
                  {notice.updatedAt !== notice.createdAt ? " · 수정됨" : ""}
                </span>
              </div>
              <h3 className="font-medium [overflow-wrap:anywhere]">
                {notice.title}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                {notice.body}
              </p>
              {admin ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || editing !== null}
                    onClick={() => edit(notice)}
                  >
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || editing !== null}
                    onClick={() => void submit(notice)}
                  >
                    {notice.archived ? "다시 게시" : "숨기기"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            등록된 공지사항이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

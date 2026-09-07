"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import {
  EmptyState,
  InlineMessage,
  PageHeader,
} from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/domain/status";

export function InquiriesView() {
  const { state } = useApp();
  const students = state.profiles.filter((item) => item.role === "student");
  const messages = state.inquiryMessages ?? [];
  const rows = students
    .map((student) => {
      const thread = messages
        .filter((item) => item.studentId === student.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const unread = thread.filter(
        (item) => item.authorId === student.id && !item.readByAdminAt,
      ).length;
      return { student, thread, unread, latest: thread.at(-1) };
    })
    .filter((row) => row.thread.length)
    .sort((a, b) =>
      (b.latest?.createdAt ?? "").localeCompare(a.latest?.createdAt ?? ""),
    );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생 관리"
        title="문의함"
        description="학생이 남긴 문의를 확인하고 답변합니다."
      />
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {rows.map(({ student, latest, unread }) => (
              <Link
                key={student.id}
                href={`/admin/inquiries/${student.id}`}
                className="flex items-center gap-4 rounded-lg p-4 hover:bg-zinc-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{student.displayName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {latest?.body}
                  </p>
                </div>
                {unread ? (
                  <Badge>
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-foreground"
                    />
                    새 문의 {unread}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(latest?.createdAt, true)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="아직 문의가 없습니다"
          description="학생이 문의를 남기면 여기에 표시됩니다."
        />
      )}
    </div>
  );
}

export function InquiryThreadView({ studentId }: { studentId: string }) {
  const { state, session, sendInquiryMessage, markInquiryRead } = useApp();
  const student = state.profiles.find(
    (item) => item.id === studentId && item.role === "student",
  );
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const messages = (state.inquiryMessages ?? [])
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const unreadCount = messages.filter(
    (item) => item.authorId === studentId && !item.readByAdminAt,
  ).length;
  useEffect(() => {
    if (unreadCount) void markInquiryRead(studentId);
  }, [markInquiryRead, studentId, unreadCount]);
  if (!student)
    return (
      <EmptyState
        title="학생을 찾을 수 없습니다"
        description="문의함 목록에서 다시 선택해 주세요."
      />
    );
  async function reply() {
    setPending(true);
    setError("");
    try {
      await sendInquiryMessage(body, studentId);
      setBody("");
      toast.success("답변을 보냈습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "답변을 보내지 못했습니다.";
      setError(`${message} 작성한 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="문의함"
        title={`${student.displayName}님의 문의`}
        action={
          <Button variant="outline" render={<Link href="/admin/inquiries" />}>
            목록으로
          </Button>
        }
      />
      <div className="space-y-3">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.authorId === session?.id;
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg border p-4 ${mine ? "border-primary bg-accent text-foreground" : "bg-white"}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={mine ? "secondary" : "outline"}>
                      {mine ? "강사" : student.displayName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(message.createdAt, true)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {message.body}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="아직 문의가 없습니다"
            description="학생이 문의를 남기면 여기에 표시됩니다."
          />
        )}
      </div>
      {error ? (
        <InlineMessage
          kind="error"
          title="답변을 보내지 못했습니다"
          description={error}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">답변 보내기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="inquiry-reply">답변 내용</Label>
          <Textarea
            id="inquiry-reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="확인한 내용이나 안내를 적어 주세요."
          />
          <Button
            className="w-full"
            disabled={pending || !body.trim()}
            aria-busy={pending}
            onClick={reply}
          >
            {pending ? "보내는 중…" : "답변 보내기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

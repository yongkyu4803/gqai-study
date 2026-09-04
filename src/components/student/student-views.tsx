"use client";
/* eslint-disable @next/next/no-img-element -- private signed/blob asset URLs are dynamic and short-lived */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  File,
  ImageIcon,
  Link2,
  MessageSquareText,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useApp } from "@/components/providers/app-provider";
import { GqaiIcon } from "@/components/common/gqai-icon";
import {
  EmptyState,
  InlineMessage,
  PageHeader,
  StatusBadge,
} from "@/components/common/page-parts";
import { ModuleReader } from "@/components/modules/module-reader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  feedbackKindLabel,
  formatDate,
  formatFileSize,
  studentPriority,
} from "@/lib/domain/status";
import type {
  FileAsset,
  SubmissionItem,
  SubmissionItemType,
} from "@/lib/domain/types";
import { isSafeAssetUrl, isSafeHttpUrl } from "@/lib/domain/validation";

function ownedAssignments(
  state: ReturnType<typeof useApp>["state"],
  studentId?: string,
) {
  return state.assignments.filter((item) => item.studentId === studentId);
}

export function LearningHomeView({
  historyOnly = false,
}: {
  historyOnly?: boolean;
}) {
  const { state, session } = useApp();
  const [query, setQuery] = useState("");
  const assignments = useMemo(
    () =>
      ownedAssignments(state, session?.id)
        .filter((item) =>
          historyOnly
            ? item.assignmentStatus === "completed"
            : item.assignmentStatus !== "completed" &&
              item.assignmentStatus !== "cancelled",
        )
        .filter((item) =>
          state.versions
            .find((version) => version.id === item.moduleVersionId)
            ?.snapshot.title.toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            studentPriority[a.assignmentStatus] -
            studentPriority[b.assignmentStatus],
        ),
    [historyOnly, query, session?.id, state],
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={historyOnly ? "나의 기록" : "학습 공간"}
        title={
          historyOnly
            ? "완료 기록"
            : `${session?.displayName ?? "학생"}님의 학습`
        }
        description={
          historyOnly
            ? "최종 완료한 실습과 제출·피드백 이력을 다시 확인할 수 있습니다."
            : "지금 필요한 행동이 있는 카드부터 정리했습니다."
        }
      />
      <div className="max-w-md space-y-2">
        <Label htmlFor="learning-search">학습 카드 검색</Label>
        <Input
          id="learning-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: AI와 친해지기"
        />
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        학습 카드 {assignments.length}개 표시 중
      </p>
      {assignments.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const version = state.versions.find(
              (item) => item.id === assignment.moduleVersionId,
            );
            const unread = state.feedback.filter(
              (message) =>
                message.assignmentId === assignment.id &&
                message.authorId !== session?.id &&
                !message.readByStudentAt,
            ).length;
            const progress =
              assignment.learningStatus === "course_completed"
                ? 100
                : assignment.learningStatus === "in_progress"
                  ? 55
                  : 10;
            return (
              <Link href={`/learn/${assignment.id}`} key={assignment.id}>
                <Card className="h-full transition hover:border-zinc-400">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge value={assignment.assignmentStatus} />
                      {unread ? (
                        <Badge>
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-foreground"
                          />
                          새 피드백 {unread}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="mt-4 text-lg [overflow-wrap:anywhere]">
                      {version?.snapshot.title}
                    </CardTitle>
                    <CardDescription className="[overflow-wrap:anywhere]">
                      {version?.snapshot.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {assignment.learningStatus === "course_completed"
                          ? "수강 완료"
                          : assignment.learningStatus === "in_progress"
                            ? "학습 중"
                            : "시작 전"}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>약 {version?.snapshot.estimatedMinutes}분</span>
                      <span className="inline-flex items-center gap-1 text-zinc-900">
                        카드 열기
                        <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            historyOnly
              ? "완료한 실습이 없습니다"
              : "진행할 학습 카드가 없습니다"
          }
          description={
            historyOnly
              ? "강사가 최종 완료한 카드가 여기에 쌓입니다."
              : "새 카드가 배정되면 이곳에서 바로 시작할 수 있습니다."
          }
        />
      )}
    </div>
  );
}

export function LearningDetailView({ assignmentId }: { assignmentId: string }) {
  const { state, session, openAssignment, updateLearning } = useApp();
  const assignment = state.assignments.find(
    (item) => item.id === assignmentId && item.studentId === session?.id,
  );
  const [note, setNote] = useState(assignment?.studentNote ?? "");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    if (
      assignment &&
      !assignment.firstOpenedAt &&
      !["completed", "cancelled", "stopped"].includes(
        assignment.assignmentStatus,
      )
    )
      void openAssignment(assignment.id);
  }, [assignment, openAssignment]);
  if (!assignment)
    return (
      <EmptyState
        title="학습 카드를 열 수 없습니다"
        description="본인에게 배정된 카드인지 확인해 주세요."
        action={<Button render={<Link href="/learn" />}>내 학습으로</Button>}
      />
    );
  const version = state.versions.find(
    (item) => item.id === assignment.moduleVersionId,
  );
  const submissions = state.submissions.filter(
    (item) => item.assignmentId === assignment.id && item.status !== "draft",
  );
  const messages = state.feedback.filter(
    (item) => item.assignmentId === assignment.id,
  );
  const latestFeedback = [...messages]
    .reverse()
    .find((item) => item.authorId !== session?.id);
  const isReadOnly = ["completed", "cancelled", "stopped"].includes(
    assignment.assignmentStatus,
  );
  const currentAssignmentId = assignment.id;
  const learningStatus = assignment.learningStatus;
  async function changeLearning(action: "start" | "toggle_complete") {
    setPending(true);
    setActionError("");
    try {
      await updateLearning(currentAssignmentId, action);
      toast.success(
        action === "start"
          ? "학습을 시작했습니다."
          : learningStatus === "course_completed"
            ? "학습 중으로 되돌렸습니다."
            : "수강 완료를 기록했습니다.",
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "학습 상태를 저장하지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function saveNote() {
    setPending(true);
    setActionError("");
    try {
      await updateLearning(currentAssignmentId, "note", note);
      toast.success("개인 메모를 저장했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "개인 메모를 저장하지 못했습니다.";
      setActionError(`${message} 작성한 메모는 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-6">
      <Link
        href="/learn"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />내 학습
      </Link>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {assignment.personalInstruction ? (
            <Alert>
              <MessageSquareText className="size-4" />
              <AlertTitle>강사 안내</AlertTitle>
              <AlertDescription>
                {assignment.personalInstruction}
              </AlertDescription>
            </Alert>
          ) : null}
          {latestFeedback?.kind === "revision_request" ? (
            <Alert variant="destructive">
              <GqaiIcon name="status-warning" />
              <AlertTitle>재제출 요청</AlertTitle>
              <AlertDescription>{latestFeedback.body}</AlertDescription>
            </Alert>
          ) : null}
          {version ? (
            <Card>
              <CardContent className="p-6 sm:p-8">
                <ModuleReader snapshot={version.snapshot} />
              </CardContent>
            </Card>
          ) : null}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-8 xl:h-fit">
          {actionError ? (
            <InlineMessage
              kind="error"
              title="학습 기록을 저장하지 못했습니다"
              description={actionError}
            />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">나의 진행</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <StatusBadge
                  value={assignment.learningStatus}
                  kind="learning"
                />
                <StatusBadge value={assignment.assignmentStatus} />
              </div>
              {isReadOnly ? (
                <Alert>
                  <GqaiIcon name="status-lock" />
                  <AlertTitle>읽기 전용 카드</AlertTitle>
                  <AlertDescription>
                    학습 내용과 기존 이력은 계속 확인할 수 있습니다.
                  </AlertDescription>
                </Alert>
              ) : assignment.learningStatus === "not_started" ? (
                <Button
                  className="w-full"
                  onClick={() => changeLearning("start")}
                  disabled={pending}
                  aria-busy={pending}
                >
                  <BookOpen />
                  {pending ? "시작 중…" : "학습 시작"}
                </Button>
              ) : (
                <Button
                  variant={
                    assignment.learningStatus === "course_completed"
                      ? "outline"
                      : "default"
                  }
                  className="w-full"
                  onClick={() => changeLearning("toggle_complete")}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {assignment.learningStatus === "course_completed" ? (
                    pending ? (
                      "처리 중…"
                    ) : (
                      "수강 완료 취소"
                    )
                  ) : (
                    <>
                      <Check />
                      {pending ? "기록 중…" : "수강 완료 기록"}
                    </>
                  )}
                </Button>
              )}
              {!isReadOnly ? (
                <Button
                  variant="outline"
                  className="w-full"
                  render={<Link href={`/learn/${assignment.id}/submit`} />}
                >
                  {assignment.assignmentStatus === "revision_requested"
                    ? "수정해서 재제출"
                    : submissions.length
                      ? "새 차수 제출"
                      : "결과물 제출"}
                </Button>
              ) : null}
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <Link
                  href={`/learn/${assignment.id}/submissions`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  제출 {submissions.length}
                </Link>
                <Link
                  href={`/learn/${assignment.id}/feedback`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  피드백 {messages.length}
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">개인 메모</CardTitle>
              <CardDescription>강사에게 공개되지 않습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="student-private-note">개인 메모 내용</Label>
              <Textarea
                id="student-private-note"
                value={note}
                disabled={isReadOnly || pending}
                onChange={(e) => setNote(e.target.value)}
                placeholder="학습하며 기억할 내용을 적어두세요."
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={isReadOnly || pending}
                aria-busy={pending}
                onClick={saveNote}
              >
                <Save />
                메모 저장
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function SubmissionView({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const { state, session, saveSubmission, saveAndSubmit, uploadFile } =
    useApp();
  const assignment = state.assignments.find(
    (item) => item.id === assignmentId && item.studentId === session?.id,
  );
  const draft = state.submissions.find(
    (item) => item.assignmentId === assignmentId && item.status === "draft",
  );
  const latest = state.submissions
    .filter(
      (item) => item.assignmentId === assignmentId && item.status !== "draft",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const [items, setItems] = useState<SubmissionItem[]>(
    () =>
      draft?.items ??
      (latest && assignment?.assignmentStatus === "revision_requested"
        ? latest.items.map((item) => ({ ...item, id: nanoid() }))
        : []),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!assignment)
    return (
      <EmptyState
        title="제출할 수 없는 카드입니다"
        description="내 학습에서 카드를 다시 선택해 주세요."
      />
    );
  const currentAssignment = assignment;
  const version = state.versions.find(
    (item) => item.id === assignment.moduleVersionId,
  );
  function add(type: SubmissionItemType) {
    setItems((current) => [
      ...current,
      {
        id: nanoid(),
        type,
        order: current.length,
        text: type === "text" ? "" : undefined,
        url: type === "link" ? "" : undefined,
      },
    ]);
  }
  function update(id: string, patch: Partial<SubmissionItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  async function attach(
    event: ChangeEvent<HTMLInputElement>,
    item: SubmissionItem,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const asset = await uploadFile(file, {
        kind: "submission",
        assignmentId,
      });
      update(item.id, { asset });
      toast.success("파일을 추가했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "파일을 올리지 못했습니다.";
      setError(`${message} 파일을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  function validItems() {
    return items
      .filter((item) =>
        item.type === "text"
          ? item.text?.trim()
          : item.type === "link"
            ? /^https?:\/\//.test(item.url ?? "")
            : Boolean(item.asset),
      )
      .map((item, index) => ({ ...item, order: index }));
  }
  async function save(submit: boolean) {
    const cleaned = validItems();
    if (!cleaned.length) {
      setError("완성된 제출 항목을 한 개 이상 추가해 주세요.");
      return;
    }
    if (cleaned.length !== items.length) {
      setError("비어 있거나 올바르지 않은 항목을 확인해 주세요.");
      return;
    }
    setError("");
    setPending(true);
    try {
      if (submit) {
        await saveAndSubmit({
          assignmentId,
          items: cleaned,
          basedOnSubmissionId:
            currentAssignment.assignmentStatus === "revision_requested"
              ? latest?.id
              : undefined,
        });
        toast.success("결과물을 제출했습니다.");
        router.push(`/learn/${assignmentId}/submissions`);
      } else {
        await saveSubmission({
          assignmentId,
          items: cleaned,
          basedOnSubmissionId:
            currentAssignment.assignmentStatus === "revision_requested"
              ? latest?.id
              : undefined,
        });
        toast.success("초안을 저장했습니다.");
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "저장하지 못했습니다.";
      setError(`${message} 입력 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/learn/${assignmentId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        카드로 돌아가기
      </Link>
      <PageHeader
        eyebrow="결과물"
        title={
          assignment.assignmentStatus === "revision_requested"
            ? "수정해서 재제출"
            : "결과물 제출"
        }
        description={version?.snapshot.title}
      />
      {version?.snapshot.submissionRequirements.length ? (
        <Alert>
          <File className="size-4" />
          <AlertTitle>제출할 것</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {version.snapshot.submissionRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <InlineMessage
          kind="error"
          title="결과물을 저장하지 못했습니다"
          description={error}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">제출 항목</CardTitle>
          <CardDescription>
            텍스트, 링크, 이미지와 일반 파일을 함께 제출할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center">
                <Badge variant="outline">
                  {item.type === "text"
                    ? "텍스트"
                    : item.type === "link"
                      ? "링크"
                      : item.type === "image"
                        ? "이미지"
                        : "파일"}
                </Badge>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="ml-auto"
                  aria-label="항목 삭제"
                  disabled={pending}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((target) => target.id !== item.id),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              {item.type === "text" ? (
                <Textarea
                  aria-label={`${index + 1}번 텍스트 결과`}
                  value={item.text ?? ""}
                  disabled={pending}
                  onChange={(e) => update(item.id, { text: e.target.value })}
                  placeholder="수행 결과와 배운 점을 적어 주세요."
                />
              ) : item.type === "link" ? (
                <Input
                  aria-label={`${index + 1}번 링크 결과`}
                  type="url"
                  value={item.url ?? ""}
                  disabled={pending}
                  onChange={(e) => update(item.id, { url: e.target.value })}
                  placeholder="https://"
                />
              ) : (
                <div>
                  <Input
                    aria-label={`${index + 1}번 ${item.type === "image" ? "이미지" : "파일"} 선택`}
                    type="file"
                    accept={item.type === "image" ? "image/*" : undefined}
                    disabled={pending}
                    onChange={(e) => attach(e, item)}
                  />
                  {item.asset ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.asset.name} · {formatFileSize(item.asset.size)}
                    </p>
                  ) : null}
                </div>
              )}
              <span className="mt-2 block text-right text-[10px] text-muted-foreground">
                항목 {index + 1}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => add("text")}
            >
              <Plus />
              <span>텍스트</span>
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => add("link")}
            >
              <Link2 />
              <span>링크</span>
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => add("image")}
            >
              <ImageIcon />
              <span>이미지</span>
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => add("file")}
            >
              <File />
              <span>파일</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={pending}
          aria-busy={pending}
        >
          <Save />
          {pending ? "저장 중…" : "초안 저장"}
        </Button>
        <Button
          onClick={() => save(true)}
          disabled={pending}
          aria-busy={pending}
        >
          <Send />
          {pending ? "처리 중…" : "최종 제출"}
        </Button>
      </div>
    </div>
  );
}

export function SubmissionHistoryView({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const { state, session } = useApp();
  const assignment = state.assignments.find(
    (item) => item.id === assignmentId && item.studentId === session?.id,
  );
  if (!assignment)
    return (
      <EmptyState
        title="제출 이력을 볼 수 없습니다"
        description="본인의 카드인지 확인해 주세요."
      />
    );
  const version = state.versions.find(
    (item) => item.id === assignment.moduleVersionId,
  );
  const submissions = state.submissions
    .filter(
      (item) => item.assignmentId === assignmentId && item.status !== "draft",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="제출 기록"
        title={version?.snapshot.title ?? "제출 이력"}
        description="재제출해도 이전 차수는 그대로 보존됩니다."
        action={
          <Button
            variant="outline"
            render={<Link href={`/learn/${assignmentId}`} />}
          >
            카드로
          </Button>
        }
      />
      {submissions.length ? (
        submissions.map((submission) => (
          <Card key={submission.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {submission.revisionNumber}차 제출
                </CardTitle>
                <Badge variant="outline">
                  {formatDate(submission.submittedAt, true)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {submission.items.map((item) => (
                <SubmissionItemView key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyState
          title="제출 기록이 없습니다"
          description="결과물을 작성해 첫 제출을 남겨 보세요."
          action={
            <Button render={<Link href={`/learn/${assignmentId}/submit`} />}>
              결과물 작성
            </Button>
          }
        />
      )}
    </div>
  );
}

export function FeedbackView({ assignmentId }: { assignmentId: string }) {
  const { state, session, markFeedbackRead, createFeedback, uploadFile } =
    useApp();
  const assignment = state.assignments.find(
    (item) => item.id === assignmentId && item.studentId === session?.id,
  );
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<FileAsset[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = state.feedback.filter(
    (item) =>
      item.assignmentId === assignmentId &&
      item.authorId !== session?.id &&
      !item.readByStudentAt,
  ).length;
  useEffect(() => {
    if (assignment && unreadCount) void markFeedbackRead(assignment.id);
  }, [assignment, markFeedbackRead, unreadCount]);
  if (!assignment)
    return (
      <EmptyState
        title="피드백을 볼 수 없습니다"
        description="본인의 카드인지 확인해 주세요."
      />
    );
  const version = state.versions.find(
    (item) => item.id === assignment.moduleVersionId,
  );
  const messages = state.feedback
    .filter((item) => item.assignmentId === assignmentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const asset = await uploadFile(file, { kind: "feedback", assignmentId });
      setAttachments((current) => [...current, asset]);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "파일을 올리지 못했습니다.";
      setError(`${message} 파일을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function reply() {
    setPending(true);
    setError("");
    try {
      await createFeedback({
        assignmentId,
        kind: "student_reply",
        body,
        attachments,
      });
      setBody("");
      setAttachments([]);
      toast.success("답변을 남겼습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "답변을 남기지 못했습니다.";
      setError(`${message} 작성한 답변은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="강사 피드백"
        title={version?.snapshot.title ?? "피드백"}
        description="피드백과 재제출 요청을 시간순으로 확인합니다."
        action={
          <Button
            variant="outline"
            render={<Link href={`/learn/${assignmentId}`} />}
          >
            카드로
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
                      {feedbackKindLabel[message.kind]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(message.createdAt, true)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {message.body}
                  </p>
                  {message.attachments.map((asset) =>
                    isSafeAssetUrl(asset.url) ? (
                      <a
                        key={asset.id}
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-xs underline opacity-80"
                      >
                        첨부 열기 · {asset.name}
                      </a>
                    ) : (
                      <p key={asset.id} className="mt-2 text-xs opacity-70">
                        첨부 · {asset.name}
                      </p>
                    ),
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="아직 피드백이 없습니다"
            description="제출을 검토한 뒤 강사의 피드백이 이곳에 표시됩니다."
          />
        )}
      </div>
      {error ? (
        <InlineMessage
          kind="error"
          title="피드백 작업을 완료하지 못했습니다"
          description={error}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">강사에게 답변</CardTitle>
          <CardDescription>답변은 피드백 기록에 함께 남습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="student-feedback-reply">답변 내용</Label>
          <Textarea
            id="student-feedback-reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="확인한 내용이나 질문을 적어 주세요."
          />
          <Label htmlFor="student-feedback-file">파일 첨부</Label>
          <Input
            id="student-feedback-file"
            type="file"
            onChange={attach}
            disabled={pending}
          />
          {attachments.map((asset) => (
            <p key={asset.id} className="text-xs text-muted-foreground">
              {asset.name}
            </p>
          ))}
          <Button
            className="w-full"
            disabled={pending || (!body.trim() && !attachments.length)}
            aria-busy={pending}
            onClick={reply}
          >
            <Send />
            {pending ? "보내는 중…" : "답변 보내기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AllFeedbackView() {
  const { state, session } = useApp();
  const cards = ownedAssignments(state, session?.id)
    .filter((assignment) =>
      state.feedback.some((message) => message.assignmentId === assignment.id),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="피드백"
        title="전체 피드백"
        description="새 피드백과 재제출 요청이 있는 카드부터 확인하세요."
      />
      {cards.length ? (
        <div className="space-y-3">
          {cards.map((assignment) => {
            const version = state.versions.find(
              (item) => item.id === assignment.moduleVersionId,
            );
            const messages = state.feedback.filter(
              (item) => item.assignmentId === assignment.id,
            );
            const unread = messages.filter(
              (item) => item.authorId !== session?.id && !item.readByStudentAt,
            ).length;
            const latest = messages.at(-1);
            return (
              <Link
                key={assignment.id}
                href={`/learn/${assignment.id}/feedback`}
                className="flex items-center gap-4 rounded-lg border p-5 hover:bg-muted"
              >
                <MessageSquareText className="size-5 text-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium [overflow-wrap:anywhere]">
                    {version?.snapshot.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {latest?.body}
                  </p>
                </div>
                {unread ? (
                  <Badge>
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-foreground"
                    />
                    새 소식 {unread}
                  </Badge>
                ) : (
                  <StatusBadge value={assignment.assignmentStatus} />
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="아직 받은 피드백이 없습니다"
          description="제출 후 강사가 남긴 피드백이 이곳에 모입니다."
        />
      )}
    </div>
  );
}

export function AccountView() {
  const { session, state, changePassword, updateMyEmail } = useApp();
  const currentEmail =
    state.profiles.find((item) => item.id === session?.id)?.email ?? "";
  const [email, setEmail] = useState(currentEmail);
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function saveEmail() {
    setEmailPending(true);
    setEmailError("");
    try {
      await updateMyEmail(email);
      toast.success("이메일을 저장했습니다.");
    } catch (cause) {
      setEmailError(
        cause instanceof Error ? cause.message : "이메일을 저장하지 못했습니다.",
      );
    } finally {
      setEmailPending(false);
    }
  }
  async function change() {
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다. 두 입력값을 확인해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await changePassword(password);
      setPassword("");
      setConfirm("");
      toast.success("비밀번호를 변경했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "변경하지 못했습니다.";
      setError(`${message} 입력값을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeader
        eyebrow="내 정보"
        title="계정"
        description="아이디를 확인하고 비밀번호를 안전하게 변경합니다."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">로그인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Info label="이름" value={session?.displayName ?? "—"} />
          <Info label="아이디" value={session?.loginId ?? "—"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림 이메일</CardTitle>
          <CardDescription>
            새 학습 카드가 배정되거나 피드백이 도착하면 이 주소로 알려드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="account-email">이메일</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "account-email-error" : undefined}
            />
          </div>
          {emailError ? (
            <InlineMessage
              id="account-email-error"
              kind="error"
              title="이메일을 저장하지 못했습니다"
              description={emailError}
            />
          ) : null}
          <Button
            className="w-full"
            onClick={saveEmail}
            disabled={emailPending || email.trim() === currentEmail}
            aria-busy={emailPending}
          >
            {emailPending ? "저장 중…" : "저장"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
          <CardDescription>
            8자 이상이며 영문과 숫자를 포함하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-password">새 비밀번호</Label>
            <Input
              id="account-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "account-password-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-confirm">새 비밀번호 확인</Label>
            <Input
              id="account-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "account-password-error" : undefined}
            />
          </div>
          {error ? (
            <InlineMessage
              id="account-password-error"
              kind="error"
              title="비밀번호를 변경하지 못했습니다"
              description={error}
            />
          ) : null}
          <Button
            className="w-full"
            onClick={change}
            disabled={pending || !password}
            aria-busy={pending}
          >
            {pending ? "변경 중…" : "변경"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsSlotView() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="향후 확장"
        title="알림"
        description="실제 알림 발송 없이 화면 위치와 도메인 이벤트만 준비했습니다."
      />
      <Alert>
        <MessageSquareText className="size-4" />
        <AlertTitle>준비 중</AlertTitle>
        <AlertDescription>
          이메일, 문자, 카카오 알림 API는 연결되어 있지 않습니다. 현재 새
          피드백은 학습 카드와 피드백 화면에서 확인합니다.
        </AlertDescription>
      </Alert>
      <Button render={<Link href="/learn" />} className="w-full">
        내 학습으로
      </Button>
    </div>
  );
}

function SubmissionItemView({ item }: { item: SubmissionItem }) {
  if (item.type === "text")
    return (
      <p className="rounded-lg bg-zinc-50 p-4 text-sm leading-6">{item.text}</p>
    );
  if (item.type === "link")
    return isSafeHttpUrl(item.url) ? (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg border p-4 text-sm text-foreground"
      >
        <Link2 className="size-4" />
        {item.url}
      </a>
    ) : (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        사용할 수 없는 링크입니다.
      </div>
    );
  if (item.type === "image" && isSafeAssetUrl(item.asset?.url))
    return (
      <figure className="overflow-hidden rounded-lg border bg-zinc-50">
        <a href={item.asset.url} target="_blank" rel="noreferrer">
          <img
            src={item.asset.url}
            alt={item.asset.name}
            className="max-h-96 w-full object-contain"
            loading="lazy"
          />
        </a>
        <figcaption className="flex items-center gap-3 border-t bg-white p-3 text-sm">
          <ImageIcon className="size-4 text-foreground" />
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            {item.asset.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(item.asset.size)}
          </span>
        </figcaption>
      </figure>
    );
  const content = (
    <>
      <File className="size-4" />
      <span className="text-sm">{item.asset?.name}</span>
      <span className="ml-auto text-xs text-muted-foreground">
        {item.asset ? formatFileSize(item.asset.size) : ""}
      </span>
    </>
  );
  return isSafeAssetUrl(item.asset?.url) ? (
    <a
      href={item.asset.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border p-4 text-foreground"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      {content}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

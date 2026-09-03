"use client";
/* eslint-disable @next/next/no-img-element -- private signed/blob asset URLs are dynamic and short-lived */

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Clock3,
  FileText,
  MessageSquareText,
  Send,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  assignmentStatusLabel,
  feedbackKindLabel,
  formatDate,
  formatFileSize,
} from "@/lib/domain/status";
import type {
  AssignmentStatus,
  FeedbackKind,
  FileAsset,
} from "@/lib/domain/types";
import { isSafeAssetUrl, isSafeHttpUrl } from "@/lib/domain/validation";

export function AssignmentsView({
  reviewsOnly = false,
}: {
  reviewsOnly?: boolean;
}) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AssignmentStatus>(
    reviewsOnly ? "submitted" : "all",
  );
  const [studentFilter, setStudentFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const rows = useMemo(
    () =>
      state.assignments
        .filter((assignment) => {
          const student = state.profiles.find(
            (item) => item.id === assignment.studentId,
          );
          const version = state.versions.find(
            (item) => item.id === assignment.moduleVersionId,
          );
          const queryOk = `${student?.displayName} ${version?.snapshot.title}`
            .toLowerCase()
            .includes(query.toLowerCase());
          const statusOk = reviewsOnly
            ? ["submitted", "resubmitted"].includes(assignment.assignmentStatus)
            : status === "all" || assignment.assignmentStatus === status;
          const studentOk =
            studentFilter === "all" || assignment.studentId === studentFilter;
          const groupOk =
            groupFilter === "all" ||
            (groupFilter === "individual"
              ? !assignment.sourceGroupId
              : assignment.sourceGroupId === groupFilter);
          const moduleOk =
            moduleFilter === "all" ||
            version?.moduleTemplateId === moduleFilter;
          return queryOk && statusOk && studentOk && groupOk && moduleOk;
        })
        .sort((a, b) =>
          reviewsOnly
            ? a.updatedAt.localeCompare(b.updatedAt)
            : b.createdAt.localeCompare(a.createdAt),
        ),
    [
      groupFilter,
      moduleFilter,
      query,
      reviewsOnly,
      state,
      status,
      studentFilter,
    ],
  );
  // A batch sourced from a group is one management unit going forward, so
  // its members collapse into a single row here instead of one row each;
  // individually-sourced assignments keep their own row as before.
  const groupedRows = useMemo(() => {
    if (reviewsOnly) return [];
    const order: string[] = [];
    const groups = new Map<string, (typeof rows)[number][]>();
    for (const assignment of rows) {
      const key = assignment.sourceGroupId
        ? assignment.assignmentBatchId
        : assignment.id;
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(assignment);
    }
    return order.map((key) => {
      const assignments = groups.get(key)!;
      return assignments[0].sourceGroupId
        ? ({ kind: "batch", batchId: key, assignments } as const)
        : ({ kind: "individual", assignments } as const);
    });
  }, [reviewsOnly, rows]);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={reviewsOnly ? "피드백" : "운영 현황"}
        title={reviewsOnly ? "검토 대기함" : "전체 배정 현황"}
        description={
          reviewsOnly
            ? "제출과 재제출을 오래된 순서부터 확인하세요."
            : "학생 또는 그룹 상세 화면에서 모듈을 배정하면 여기에 나타납니다."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="assignment-search">배정 검색</Label>
          <Input
            id="assignment-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 김민지 또는 AI 글쓰기"
          />
        </div>
        {!reviewsOnly ? (
          <div className="space-y-2">
            <Label htmlFor="assignment-status-filter">상태</Label>
            <select
              id="assignment-status-filter"
              className="native-select w-full"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "all" | AssignmentStatus)
              }
            >
              <option value="all">모든 상태</option>
              {(Object.keys(assignmentStatusLabel) as AssignmentStatus[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {assignmentStatusLabel[value]}
                  </option>
                ),
              )}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="assignment-student-filter">학생</Label>
          <select
            id="assignment-student-filter"
            className="native-select w-full"
            value={studentFilter}
            onChange={(event) => setStudentFilter(event.target.value)}
          >
            <option value="all">모든 학생</option>
            {state.profiles
              .filter((profile) => profile.role === "student")
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignment-group-filter">그룹</Label>
          <select
            id="assignment-group-filter"
            className="native-select w-full"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="all">모든 그룹</option>
            <option value="individual">개별 배정</option>
            {state.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignment-module-filter">모듈</Label>
          <select
            id="assignment-module-filter"
            className="native-select w-full"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
          >
            <option value="all">모든 모듈</option>
            {state.modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.draft.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        배정 {rows.length}건 표시 중
      </p>
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {reviewsOnly
              ? rows.map((assignment) => {
                  const student = state.profiles.find(
                    (item) => item.id === assignment.studentId,
                  );
                  const version = state.versions.find(
                    (item) => item.id === assignment.moduleVersionId,
                  );
                  const group = state.groups.find(
                    (item) => item.id === assignment.sourceGroupId,
                  );
                  return (
                    <Link
                      key={assignment.id}
                      href={`/admin/assignments/${assignment.id}`}
                      className="grid gap-3 p-4 hover:bg-zinc-50 md:grid-cols-[1.2fr_.8fr_.7fr_110px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {version?.snapshot.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          버전 {version?.versionNumber} ·{" "}
                          {formatDate(assignment.createdAt)} 배정
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">{student?.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {group?.name ?? "개별 배정"}
                        </p>
                      </div>
                      <StatusBadge
                        value={assignment.learningStatus}
                        kind="learning"
                      />
                      <StatusBadge value={assignment.assignmentStatus} />
                    </Link>
                  );
                })
              : groupedRows.map((row) => {
                  const version = state.versions.find(
                    (item) => item.id === row.assignments[0].moduleVersionId,
                  );
                  if (row.kind === "individual") {
                    const assignment = row.assignments[0];
                    const student = state.profiles.find(
                      (item) => item.id === assignment.studentId,
                    );
                    return (
                      <Link
                        key={assignment.id}
                        href={`/admin/assignments/${assignment.id}`}
                        className="grid gap-3 p-4 hover:bg-zinc-50 md:grid-cols-[1.2fr_.8fr_.7fr_110px] md:items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {version?.snapshot.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            버전 {version?.versionNumber} ·{" "}
                            {formatDate(assignment.createdAt)} 배정
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">{student?.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            개별 배정
                          </p>
                        </div>
                        <StatusBadge
                          value={assignment.learningStatus}
                          kind="learning"
                        />
                        <StatusBadge value={assignment.assignmentStatus} />
                      </Link>
                    );
                  }
                  const group = state.groups.find(
                    (item) => item.id === row.assignments[0].sourceGroupId,
                  );
                  const completedCount = row.assignments.filter(
                    (item) => item.assignmentStatus === "completed",
                  ).length;
                  const openCount = row.assignments.filter(
                    (item) =>
                      !["completed", "cancelled", "stopped"].includes(
                        item.assignmentStatus,
                      ),
                  ).length;
                  return (
                    <Link
                      key={row.batchId}
                      href={`/admin/assignments/batch/${row.batchId}`}
                      className="grid gap-3 p-4 hover:bg-zinc-50 md:grid-cols-[1.2fr_.8fr_.7fr_110px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {version?.snapshot.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          버전 {version?.versionNumber} ·{" "}
                          {formatDate(row.assignments[0].createdAt)} 배정
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <UsersRound className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">
                            {group?.name ?? "그룹 배정"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.assignments.length}명
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        진행 중 {openCount}명
                      </p>
                      <p className="text-sm text-muted-foreground">
                        완료 {completedCount}/{row.assignments.length}
                      </p>
                    </Link>
                  );
                })}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            reviewsOnly
              ? "검토할 제출이 없습니다"
              : "조건에 맞는 카드가 없습니다"
          }
          description={
            reviewsOnly
              ? "학생이 제출하면 여기에 표시됩니다."
              : "검색어나 상태 조건을 바꿔 보세요."
          }
        />
      )}
    </div>
  );
}

export function AssignmentDetailView({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const { state, createFeedback, manageAssignment, uploadFile } = useApp();
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<FileAsset[]>([]);
  const [instruction, setInstruction] = useState(
    assignment?.personalInstruction ?? "",
  );
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  if (!assignment)
    return (
      <EmptyState
        title="배정 카드를 찾을 수 없습니다"
        description="전체 현황에서 다시 선택해 주세요."
      />
    );
  const student = state.profiles.find(
    (item) => item.id === assignment.studentId,
  );
  const version = state.versions.find(
    (item) => item.id === assignment.moduleVersionId,
  );
  const submissions = state.submissions
    .filter((item) => item.assignmentId === assignment.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const messages = state.feedback
    .filter((item) => item.assignmentId === assignment.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = [...submissions]
    .reverse()
    .find((item) => item.status === "submitted");
  const isTerminal = ["cancelled", "stopped"].includes(
    assignment.assignmentStatus,
  );
  const hasActivity = Boolean(
    assignment.firstOpenedAt ||
    assignment.startedAt ||
    assignment.courseCompletedAt ||
    submissions.some((submission) => submission.status !== "draft"),
  );
  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setActionError("");
    try {
      const asset = await uploadFile(file, { kind: "feedback", assignmentId });
      setAttachments((current) => [...current, asset]);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "파일을 올리지 못했습니다.";
      setActionError(`${message} 파일을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function send() {
    setPending(true);
    setActionError("");
    try {
      await createFeedback({
        assignmentId,
        submissionId: latest?.id,
        kind,
        body,
        attachments,
      });
      setKind("feedback");
      setBody("");
      setAttachments([]);
      toast.success(
        kind === "revision_request"
          ? "재제출을 요청했습니다."
          : kind === "final_approval"
            ? "최종 완료로 처리했습니다."
            : kind === "completion_reopened"
              ? "완료를 취소하고 피드백 상태로 되돌렸습니다."
              : "피드백을 남겼습니다.",
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "피드백을 남기지 못했습니다.";
      setActionError(`${message} 작성한 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function saveInstruction() {
    setPending(true);
    setActionError("");
    try {
      await manageAssignment(assignmentId, "set_instruction", instruction);
      toast.success("학생별 안내를 저장했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "안내를 저장하지 못했습니다.";
      setActionError(`${message} 작성한 안내는 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function closeAssignment() {
    const action = hasActivity ? "stop" : "cancel";
    const actionLabel = hasActivity ? "중단" : "취소";
    if (
      !window.confirm(
        `${student?.displayName ?? "학생"}의 이 카드를 ${actionLabel}할까요? 기존 이력은 보존됩니다.`,
      )
    )
      return;
    setPending(true);
    setActionError("");
    try {
      await manageAssignment(assignmentId, action);
      toast.success(`카드를 ${actionLabel} 처리했습니다.`);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "카드 상태를 바꾸지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생별 카드"
        title={version?.snapshot.title ?? "학습 카드"}
        description={`${student?.displayName ?? "학생"} · 버전 ${version?.versionNumber ?? "—"}`}
        action={
          <div className="flex gap-2">
            <StatusBadge value={assignment.learningStatus} kind="learning" />
            <StatusBadge value={assignment.assignmentStatus} />
          </div>
        }
      />
      {actionError ? (
        <InlineMessage
          kind="error"
          title="작업을 완료하지 못했습니다"
          description={actionError}
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-6">
          {assignment.personalInstruction ? (
            <Alert>
              <MessageSquareText className="size-4" />
              <AlertTitle>배정 안내</AlertTitle>
              <AlertDescription>
                {assignment.personalInstruction}
              </AlertDescription>
            </Alert>
          ) : null}
          {version ? (
            <Card>
              <CardContent className="p-6 sm:p-8">
                <ModuleReader snapshot={version.snapshot} compact />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">제출 이력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissions.length ? (
                submissions.map((submission) => (
                  <div key={submission.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {submission.status === "draft"
                          ? "저장된 초안"
                          : `${submission.revisionNumber}차 제출`}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(
                          submission.submittedAt ?? submission.updatedAt,
                          true,
                        )}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {submission.items.map((item) => (
                        <SubmissionItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  아직 제출한 결과물이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">학습 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Summary label="학생" value={student?.displayName ?? "—"} />
              <Summary
                label="첫 열람"
                value={formatDate(assignment.firstOpenedAt, true)}
              />
              <Summary
                label="학습 시작"
                value={formatDate(assignment.startedAt, true)}
              />
              <Summary
                label="수강 완료"
                value={formatDate(assignment.courseCompletedAt, true)}
              />
              {assignment.studentNote ? (
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-xs font-medium">학생 개인 메모</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    보안 원칙에 따라 관리자에게 공개하지 않습니다.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">카드 운영</CardTitle>
              <CardDescription>
                학생별 안내를 수정하거나 기존 이력을 보존한 채 카드를
                종료합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="personal-instruction">학생별 안내</Label>
              <Textarea
                id="personal-instruction"
                value={instruction}
                maxLength={2000}
                disabled={
                  isTerminal || assignment.assignmentStatus === "completed"
                }
                onChange={(event) => setInstruction(event.target.value)}
              />
              <Button
                className="w-full"
                variant="outline"
                disabled={
                  pending ||
                  isTerminal ||
                  assignment.assignmentStatus === "completed"
                }
                aria-busy={pending}
                onClick={saveInstruction}
              >
                {pending ? "저장 중…" : "안내 저장"}
              </Button>
              {!isTerminal && assignment.assignmentStatus !== "completed" ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={pending}
                  aria-busy={pending}
                  onClick={closeAssignment}
                >
                  {pending
                    ? "처리 중…"
                    : hasActivity
                      ? "학습 카드 중단"
                      : "학습 카드 취소"}
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">피드백 타임라인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length ? (
                messages.map((message) => {
                  const author = state.profiles.find(
                    (item) => item.id === message.authorId,
                  );
                  return (
                    <div key={message.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {feedbackKindLabel[message.kind]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {author?.displayName} ·{" "}
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
                            className="mt-2 block text-xs text-foreground underline-offset-4 hover:underline"
                          >
                            첨부 열기 · {asset.name} (
                            {formatFileSize(asset.size)})
                          </a>
                        ) : (
                          <p
                            key={asset.id}
                            className="mt-2 text-xs text-muted-foreground"
                          >
                            첨부 · {asset.name} ({formatFileSize(asset.size)})
                          </p>
                        ),
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  아직 피드백이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
          {isTerminal ? (
            <Alert>
              <GqaiIcon name="status-lock" />
              <AlertTitle>종료된 카드입니다</AlertTitle>
              <AlertDescription>
                기존 학습·제출·피드백 이력은 읽을 수 있지만 새 피드백은 추가할
                수 없습니다.
              </AlertDescription>
            </Alert>
          ) : !latest && assignment.assignmentStatus !== "completed" ? (
            <Alert>
              <GqaiIcon name="status-info" />
              <AlertTitle>제출을 기다리고 있습니다</AlertTitle>
              <AlertDescription>
                학생의 첫 제출이 도착하면 해당 차수에 피드백을 남길 수 있습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">피드백 작성</CardTitle>
                <CardDescription>
                  현재 상태에 맞는 다음 단계를 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignment.assignmentStatus === "completed" ? (
                  <Button
                    className="w-full"
                    variant={
                      kind === "completion_reopened" ? "dark" : "outline"
                    }
                    aria-pressed={kind === "completion_reopened"}
                    onClick={() => setKind("completion_reopened")}
                  >
                    완료 취소
                  </Button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={kind === "feedback" ? "dark" : "outline"}
                      aria-pressed={kind === "feedback"}
                      onClick={() => setKind("feedback")}
                    >
                      피드백
                    </Button>
                    <Button
                      variant={kind === "revision_request" ? "dark" : "outline"}
                      aria-pressed={kind === "revision_request"}
                      onClick={() => setKind("revision_request")}
                    >
                      재제출 요청
                    </Button>
                    <Button
                      variant={kind === "final_approval" ? "dark" : "outline"}
                      aria-pressed={kind === "final_approval"}
                      onClick={() => setKind("final_approval")}
                    >
                      최종 완료
                    </Button>
                  </div>
                )}
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="학생이 다음 행동을 알 수 있도록 구체적으로 작성하세요."
                />
                <div>
                  <Label htmlFor="feedback-file">파일 첨부</Label>
                  <Input
                    id="feedback-file"
                    className="mt-2"
                    type="file"
                    onChange={attach}
                    disabled={pending}
                  />
                  {attachments.map((asset) => (
                    <p
                      key={asset.id}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {asset.name}
                    </p>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed bg-muted p-4 text-muted-foreground">
                  <p className="text-xs font-medium">AI 보조 피드백</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    향후 기능 연결 위치 · 현재 외부 호출 없음
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={send}
                  disabled={pending || (!body.trim() && !attachments.length)}
                  aria-busy={pending}
                >
                  <Send />
                  {pending ? "저장 중…" : "피드백 저장"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function BatchDetailView({ batchId }: { batchId: string }) {
  const { state, setBatchInstruction, closeBatch } = useApp();
  const batch = state.batches.find((item) => item.id === batchId);
  const members = state.assignments
    .filter((item) => item.assignmentBatchId === batchId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [instruction, setInstruction] = useState(
    batch?.commonInstruction ?? "",
  );
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  if (!batch)
    return (
      <EmptyState
        title="배정을 찾을 수 없습니다"
        description="배정 현황에서 다시 선택해 주세요."
      />
    );
  const version = state.versions.find(
    (item) => item.id === batch.moduleVersionId,
  );
  const group = state.groups.find((item) => item.id === batch.sourceGroupId);
  const openMembers = members.filter(
    (item) =>
      !["completed", "cancelled", "stopped"].includes(item.assignmentStatus),
  );
  async function saveInstruction() {
    setPending(true);
    setActionError("");
    try {
      const { updatedCount, failedCount } = await setBatchInstruction(
        batchId,
        instruction,
      );
      toast.success(
        failedCount
          ? `${updatedCount}명에게 반영했습니다. ${failedCount}건은 실패했습니다.`
          : `${updatedCount}명에게 안내를 반영했습니다.`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "반영하지 못했습니다.";
      setActionError(`${message} 공통 안내는 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function closeAll() {
    if (
      !window.confirm(
        `진행 중인 카드 ${openMembers.length}건을 모두 종료할까요? 기존 이력은 보존됩니다.`,
      )
    )
      return;
    setPending(true);
    setActionError("");
    try {
      const { updatedCount, failedCount } = await closeBatch(batchId);
      toast.success(
        failedCount
          ? `${updatedCount}건을 종료했습니다. ${failedCount}건은 실패했습니다.`
          : `${updatedCount}건을 종료했습니다.`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "종료하지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="그룹 배정"
        title={version?.snapshot.title ?? "학습 카드"}
        description={`${group?.name ?? "그룹 배정"} · ${formatDate(
          batch.assignedAt,
        )} 배정 · ${members.length}명`}
      />
      {actionError ? (
        <InlineMessage
          kind="error"
          title="그룹 배정 작업을 완료하지 못했습니다"
          description={actionError}
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">구성원별 진행 상태</CardTitle>
            <CardDescription>
              개별 피드백과 안내는 각 학생 카드에서 남깁니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((assignment) => {
              const student = state.profiles.find(
                (item) => item.id === assignment.studentId,
              );
              return (
                <Link
                  key={assignment.id}
                  href={`/admin/assignments/${assignment.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm hover:bg-zinc-50"
                >
                  <span>{student?.displayName ?? "알 수 없음"}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge
                      value={assignment.learningStatus}
                      kind="learning"
                    />
                    <StatusBadge value={assignment.assignmentStatus} />
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">공통 안내 일괄 수정</CardTitle>
              <CardDescription>
                진행 중인 카드 {openMembers.length}건에 한 번에 반영됩니다.
                완료·중단·취소된 카드는 바뀌지 않습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={instruction}
                maxLength={2000}
                onChange={(event) => setInstruction(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={pending || !openMembers.length}
                aria-busy={pending}
                onClick={saveInstruction}
              >
                {pending ? "반영 중…" : `${openMembers.length}건에 반영`}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">그룹 전체 종료</CardTitle>
              <CardDescription>
                활동 여부에 따라 학생마다 중단 또는 취소로 자동 처리되고, 기존
                이력은 보존됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                disabled={pending || !openMembers.length}
                aria-busy={pending}
                onClick={closeAll}
              >
                {pending
                  ? "종료 중…"
                  : `진행 중인 ${openMembers.length}건 종료`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { mode, state, resetDemo } = useApp();
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="운영 설정"
        title="설정"
        description="연결 상태와 향후 확장 슬롯을 확인합니다."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">실행 모드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {mode === "demo" ? "데모 모드" : "Supabase 운영 모드"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "demo"
                  ? "브라우저에만 데이터가 저장됩니다."
                  : "인증·데이터베이스·비공개 저장소가 연결되었습니다."}
              </p>
            </div>
            {mode === "demo" ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetDemo();
                  toast.success("데모 데이터를 초기화했습니다.");
                }}
              >
                데모 초기화
              </Button>
            ) : (
              <Badge>
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-foreground"
                />
                연결됨
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">향후 기능 위치</CardTitle>
          <CardDescription>
            기능 구현이나 외부 API 호출 없이 위치만 확보했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {state.featureFlags.map((flag) => (
            <div key={flag.key} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{flag.key}</p>
                <Badge variant="secondary">꺼짐</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {flag.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function FutureSlotView({ kind }: { kind: "schedule" | "payments" }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="향후 확장"
        title={kind === "schedule" ? "일정 관리" : "결제 관리"}
        description="MVP에서는 기능을 구현하지 않고 안전한 연결 위치만 확보했습니다."
      />
      <Alert>
        <Clock3 className="size-4" />
        <AlertTitle>준비 중</AlertTitle>
        <AlertDescription>
          {kind === "schedule"
            ? "캘린더, 출석, 리마인더 API는 연결되어 있지 않습니다."
            : "결제사 SDK, 거래, 환불 데이터는 생성하지 않습니다."}
        </AlertDescription>
      </Alert>
      <Button
        variant="outline"
        render={<Link href="/admin/settings" />}
        className="w-full"
      >
        설정으로 돌아가기
      </Button>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function SubmissionItemRow({
  item,
}: {
  item: ReturnType<
    typeof useApp
  >["state"]["submissions"][number]["items"][number];
}) {
  if (item.type === "text")
    return (
      <p className="rounded-md bg-zinc-50 p-3 text-sm leading-6">{item.text}</p>
    );
  if (item.type === "link")
    return isSafeHttpUrl(item.url) ? (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-md border p-3 text-sm text-foreground"
      >
        <ArrowRight className="size-3.5" />
        {item.url}
      </a>
    ) : (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
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
        <figcaption className="flex items-center gap-2 border-t bg-white p-3 text-sm">
          <FileText className="size-4" />
          {item.asset.name}
        </figcaption>
      </figure>
    );
  const content = (
    <>
      <FileText className="size-4" />
      {item.asset?.name ?? "첨부파일"}
    </>
  );
  return isSafeAssetUrl(item.asset?.url) ? (
    <a
      href={item.asset.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border p-3 text-sm text-foreground"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
      {content}
    </div>
  );
}

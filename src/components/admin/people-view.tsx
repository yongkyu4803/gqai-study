"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Archive,
  KeyRound,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import {
  EmptyState,
  InlineMessage,
  PageHeader,
  StatusBadge,
} from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/domain/status";

export function StudentsView({ createOnly = false }: { createOnly?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, createStudent } = useApp();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showForm, setShowForm] = useState(createOnly);
  const students = state.profiles.filter(
    (item) =>
      item.role === "student" &&
      (activeFilter === "all" ||
        (activeFilter === "active" ? item.isActive : !item.isActive)) &&
      `${item.displayName} ${item.loginId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (createOnly) {
    const prefillLoginId = searchParams.get("loginId") || "";
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          eyebrow="학생 관리"
          title="학생 계정 발급"
          description="아이디와 임시 비밀번호를 강사가 직접 정합니다."
        />
        <StudentForm
          groups={state.groups.filter((g) => !g.isArchived)}
          initialDisplayName={searchParams.get("displayName") || ""}
          initialLoginId={prefillLoginId}
          initialPassword={prefillLoginId ? `${prefillLoginId}A123!` : ""}
          initialEmail={searchParams.get("email") || ""}
          onCancel={() => router.push("/admin/students")}
          onCreate={async (input) => {
            const id = await createStudent(input);
            toast.success(
              "학생 계정을 발급했습니다. 임시 비밀번호는 지금 안전하게 전달하세요.",
            );
            router.push(`/admin/students/${id}`);
          }}
        />
      </div>
    );
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생 관리"
        title="학생"
        description="계정 상태, 소속 그룹과 학생별 학습 기록을 관리합니다."
        action={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="size-4" />
            학생 추가
          </Button>
        }
      />
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 학생 계정</CardTitle>
            <CardDescription>
              저장 후 비밀번호는 다시 표시하지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentForm
              groups={state.groups.filter((g) => !g.isArchived)}
              onCancel={() => setShowForm(false)}
              onCreate={async (input) => {
                await createStudent(input);
                toast.success("학생 계정을 발급했습니다.");
                setShowForm(false);
              }}
            />
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 sm:max-w-2xl sm:grid-cols-[minmax(260px,1fr)_180px]">
        <div className="space-y-2">
          <Label htmlFor="student-search">학생 검색</Label>
          <Input
            id="student-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 김민지 또는 minji"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-status-filter">계정 상태</Label>
          <select
            id="student-status-filter"
            className="native-select w-full"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="all">모든 계정</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        학생 {students.length}명 표시 중
      </p>
      {students.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {students.map((student) => {
              const groups = state.groups.filter((group) =>
                group.memberIds.includes(student.id),
              );
              const assigned = state.assignments.filter(
                (item) => item.studentId === student.id,
              );
              return (
                <Link
                  href={`/admin/students/${student.id}`}
                  key={student.id}
                  className="grid gap-3 p-4 hover:bg-zinc-50 sm:grid-cols-[1fr_1fr_100px_100px] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{student.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{student.loginId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {groups.length ? (
                      groups.map((group) => (
                        <Badge
                          key={group.id}
                          variant="outline"
                          className="font-normal"
                        >
                          {group.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        그룹 없음
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    카드 {assigned.length}개
                  </span>
                  <Badge
                    variant={student.isActive ? "outline" : "secondary"}
                    className="w-fit"
                  >
                    {student.isActive ? "활성" : "비활성"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="학생이 없습니다"
          description="첫 학생 계정을 발급하세요."
        />
      )}
    </div>
  );
}

function StudentForm({
  groups,
  initialDisplayName = "",
  initialLoginId = "",
  initialPassword = "",
  initialEmail = "",
  onCancel,
  onCreate,
}: {
  groups: ReturnType<typeof useApp>["state"]["groups"];
  initialDisplayName?: string;
  initialLoginId?: string;
  initialPassword?: string;
  initialEmail?: string;
  onCancel: () => void;
  onCreate: (input: {
    displayName: string;
    loginId: string;
    password: string;
    email?: string;
    groupIds: string[];
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [loginId, setLoginId] = useState(initialLoginId);
  const [password, setPassword] = useState(initialPassword);
  const [email, setEmail] = useState(initialEmail);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await onCreate({ displayName, loginId, password, email, groupIds });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "학생을 만들지 못했습니다.";
      setError(`${message} 입력 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">이름</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentLoginId">로그인 아이디</Label>
          <Input
            id="studentLoginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoCapitalize="none"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="studentEmail">이메일 (배정 알림 발송용)</Label>
        <Input
          id="studentEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tempPassword">임시 비밀번호</Label>
        <Input
          id="tempPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          8자 이상, 영문과 숫자를 포함합니다. 학생은 첫 로그인 후 변경합니다.
        </p>
      </div>
      {groups.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">초기 그룹</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={groupIds.includes(group.id)}
                  onChange={() =>
                    setGroupIds((current) =>
                      current.includes(group.id)
                        ? current.filter((id) => id !== group.id)
                        : [...current, group.id],
                    )
                  }
                />
                {group.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <InlineMessage
          kind="error"
          title="학생 계정을 발급하지 못했습니다"
          description={error}
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "발급 중…" : "계정 발급"}
        </Button>
      </div>
    </form>
  );
}

export function StudentDetailView({ studentId }: { studentId: string }) {
  const { state, resetStudentPassword, toggleStudentActive, assignMany } =
    useApp();
  const student = state.profiles.find(
    (item) => item.id === studentId && item.role === "student",
  );
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignModuleVersionIds, setAssignModuleVersionIds] = useState<
    string[]
  >([]);
  const [assignInstruction, setAssignInstruction] = useState("");
  const [assignPending, setAssignPending] = useState(false);
  const [assignError, setAssignError] = useState("");
  if (!student)
    return (
      <EmptyState
        title="학생을 찾을 수 없습니다"
        description="학생 목록에서 다시 선택해 주세요."
      />
    );
  const groups = state.groups.filter((group) =>
    group.memberIds.includes(student.id),
  );
  const assignments = state.assignments.filter(
    (item) => item.studentId === student.id,
  );
  const currentStudentId = student.id;
  const studentWasActive = student.isActive;
  const activeModules = state.modules.filter(
    (item) => item.status === "active" && item.currentVersionId,
  );
  function hasOpenAssignmentForModule(moduleVersionId: string) {
    return assignments.some(
      (item) =>
        item.moduleVersionId === moduleVersionId &&
        !["completed", "cancelled", "stopped"].includes(
          item.assignmentStatus,
        ),
    );
  }
  function toggleAssignModule(versionId: string) {
    setAssignModuleVersionIds((current) =>
      current.includes(versionId)
        ? current.filter((id) => id !== versionId)
        : [...current, versionId],
    );
  }
  async function confirmAssign() {
    setAssignPending(true);
    setAssignError("");
    try {
      const plan = assignModuleVersionIds.map((moduleVersionId) => ({
        moduleVersionId,
        targetKind: "students" as const,
        studentIds: [currentStudentId],
        commonInstruction: assignInstruction,
      }));
      const { createdCount, failedCount } = await assignMany(plan);
      if (createdCount) {
        toast.success(
          failedCount
            ? `${createdCount}개의 학습 카드를 만들었습니다. ${failedCount}건은 실패했습니다.`
            : `${createdCount}개의 학습 카드를 만들었습니다.`,
        );
        setShowAssignDialog(false);
        setAssignModuleVersionIds([]);
        setAssignInstruction("");
      } else {
        setAssignError("카드를 만들지 못했습니다. 모듈을 확인하세요.");
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "배정하지 못했습니다.";
      setAssignError(`${message} 선택 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setAssignPending(false);
    }
  }
  async function changeActiveState() {
    setPending(true);
    setError("");
    try {
      await toggleStudentActive(currentStudentId);
      toast.success(
        studentWasActive
          ? "계정을 비활성화했습니다. 기록은 유지됩니다."
          : "계정을 활성화했습니다.",
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "계정 상태를 바꾸지 못했습니다.";
      setError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function resetPassword() {
    setPending(true);
    setError("");
    try {
      await resetStudentPassword(currentStudentId, password);
      setPassword("");
      toast.success("임시 비밀번호를 재설정했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "재설정하지 못했습니다.";
      setError(`${message} 입력값을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{student.displayName}</span>
            {groups.map((group) => (
              <Badge
                key={group.id}
                variant="outline"
                render={<Link href={`/admin/groups/${group.id}`} />}
              >
                {group.name}
              </Badge>
            ))}
            <span className="text-sm font-normal text-muted-foreground">
              @{student.loginId} ·{" "}
              {student.isActive ? "활성 계정" : "비활성 계정"}
            </span>
          </span>
        }
        action={
          <Button
            variant={student.isActive ? "destructive" : "outline"}
            onClick={changeActiveState}
            disabled={pending}
            aria-busy={pending}
          >
            {student.isActive ? <UserMinus /> : <UserCheck />}
            {pending ? "처리 중…" : student.isActive ? "비활성화" : "활성화"}
          </Button>
        }
      />
      {error ? (
        <InlineMessage
          kind="error"
          title="학생 계정 작업을 완료하지 못했습니다"
          description={error}
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.7fr_.85fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">개별 학습 카드</CardTitle>
            <CardAction>
              <Button
                size="sm"
                onClick={() => {
                  setAssignError("");
                  setShowAssignDialog(true);
                }}
              >
                <Plus />
                모듈 배정
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.length ? (
              assignments.map((assignment) => {
                const version = state.versions.find(
                  (item) => item.id === assignment.moduleVersionId,
                );
                return (
                  <Link
                    key={assignment.id}
                    href={`/admin/assignments/${assignment.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-zinc-50"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">
                        {version?.snapshot.title}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(assignment.createdAt)} 배정
                      </span>
                    </p>
                    <StatusBadge value={assignment.assignmentStatus} />
                  </Link>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                배정된 카드가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계정 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="아이디" value={student.loginId} />
              <Row
                label="마지막 로그인"
                value={formatDate(student.lastLoginAt, true)}
              />
              <Row label="생성일" value={formatDate(student.createdAt)} />
              <Row
                label="비밀번호 변경"
                value={student.mustChangePassword ? "필요" : "완료"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4" />
                임시 비밀번호 재설정
              </CardTitle>
              <CardDescription>
                재설정하면 다음 로그인에서 학생이 다시 변경해야 합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="student-reset-password">새 임시 비밀번호</Label>
              <Input
                id="student-reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="예: study2026"
                disabled={pending}
              />
              <Button
                className="w-full"
                disabled={pending || !password}
                aria-busy={pending}
                onClick={resetPassword}
              >
                {pending ? "재설정 중…" : "재설정"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) {
            setAssignModuleVersionIds([]);
            setAssignInstruction("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>모듈 배정</DialogTitle>
            <DialogDescription>
              게시된 모듈을 선택해 {student.displayName}님에게 배정합니다.
              여러 개를 한 번에 선택할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {activeModules.length ? (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {activeModules.map((module) => {
                const alreadyOpen = hasOpenAssignmentForModule(
                  module.currentVersionId!,
                );
                return (
                  <label
                    key={module.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={assignModuleVersionIds.includes(
                        module.currentVersionId!,
                      )}
                      onChange={() =>
                        toggleAssignModule(module.currentVersionId!)
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block [overflow-wrap:anywhere]">
                        {module.draft.title}
                      </span>
                      {alreadyOpen ? (
                        <span className="block text-xs font-medium text-foreground">
                          이미 배정됨
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              발행된 모듈이 없습니다.
            </p>
          )}
          <Textarea
            value={assignInstruction}
            onChange={(event) => setAssignInstruction(event.target.value)}
            placeholder="개인별 안내 (선택)"
          />
          {assignError ? (
            <InlineMessage
              kind="error"
              title="카드를 배정하지 못했습니다"
              description={assignError}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={assignPending || !assignModuleVersionIds.length}
              aria-busy={assignPending}
              onClick={confirmAssign}
            >
              {assignPending
                ? "배정 중…"
                : `${assignModuleVersionIds.length}개 모듈 배정`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function GroupsView() {
  const { state, createGroup } = useApp();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const groups = state.groups;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createGroup({ name, description, memberIds });
      setName("");
      setDescription("");
      setMemberIds([]);
      setShow(false);
      toast.success("그룹을 만들었습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "그룹을 만들지 못했습니다.";
      setError(`${message} 입력 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  const students = state.profiles.filter(
    (item) => item.role === "student" && item.isActive,
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생 관리"
        title="그룹"
        description="그룹은 배정을 편하게 묶는 단위입니다. 학습 결과와 피드백은 항상 학생별로 저장됩니다."
        action={
          <Button onClick={() => setShow((value) => !value)}>
            <Plus />새 그룹
          </Button>
        }
      />
      {show ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 그룹</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-group-name">그룹 이름</Label>
                  <Input
                    id="new-group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-group-description">설명</Label>
                  <Input
                    id="new-group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">구성원</legend>
                <div className="flex flex-wrap gap-2">
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={memberIds.includes(student.id)}
                        onChange={() =>
                          setMemberIds((current) =>
                            current.includes(student.id)
                              ? current.filter((id) => id !== student.id)
                              : [...current, student.id],
                          )
                        }
                      />
                      {student.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error ? (
                <InlineMessage
                  kind="error"
                  title="그룹을 만들지 못했습니다"
                  description={error}
                />
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={pending} aria-busy={pending}>
                  {pending ? "저장 중…" : "그룹 저장"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Link key={group.id} href={`/admin/groups/${group.id}`}>
            <Card className="h-full transition hover:border-zinc-400">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <UsersRound className="size-5 text-foreground" />
                  {group.isArchived ? (
                    <Badge variant="secondary">보관</Badge>
                  ) : (
                    <Badge variant="outline">활성</Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{group.name}</CardTitle>
                <CardDescription>
                  {group.description || "설명 없음"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  현재 구성원 {group.memberIds.length}명
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GroupDetailView({ groupId }: { groupId: string }) {
  const { state, updateGroup, archiveGroup, assignMany, closeBatch } = useApp();
  const group = state.groups.find((item) => item.id === groupId);
  const students = state.profiles.filter(
    (item) => item.role === "student" && item.isActive,
  );
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [memberIds, setMemberIds] = useState(group?.memberIds ?? []);
  const [removeSelection, setRemoveSelection] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addSelection, setAddSelection] = useState<string[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignModuleVersionIds, setAssignModuleVersionIds] = useState<
    string[]
  >([]);
  const [assignInstruction, setAssignInstruction] = useState("");
  const [assignPending, setAssignPending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  if (!group)
    return (
      <EmptyState
        title="그룹을 찾을 수 없습니다"
        description="그룹 목록에서 다시 선택해 주세요."
      />
    );
  const currentGroupId = group.id;
  const groupWasArchived = group.isArchived;
  const batches = state.batches.filter(
    (item) => item.sourceGroupId === group.id,
  );
  // A group is its own entity, not just a label over individuals: when
  // people who were already studying on their own are gathered into a
  // group, the group's start date is whichever of them started earliest —
  // not the day the group record itself was created.
  const memberAssignments = state.assignments.filter((item) =>
    group.memberIds.includes(item.studentId),
  );
  const earliestStart = memberAssignments.reduce<string | null>(
    (earliest, item) =>
      !earliest || item.createdAt < earliest ? item.createdAt : earliest,
    null,
  );
  const activeModules = state.modules.filter(
    (item) => item.status === "active" && item.currentVersionId,
  );
  function openCountForBatch(batchId: string) {
    return state.assignments.filter(
      (item) =>
        item.assignmentBatchId === batchId &&
        !["completed", "cancelled", "stopped"].includes(item.assignmentStatus),
    ).length;
  }
  function hasOpenBatchForModule(moduleVersionId: string) {
    return batches.some(
      (batch) =>
        batch.moduleVersionId === moduleVersionId &&
        openCountForBatch(batch.id) > 0,
    );
  }
  const currentMembers = students.filter((student) =>
    memberIds.includes(student.id),
  );
  const addCandidates = students.filter((student) => {
    if (memberIds.includes(student.id)) return false;
    const query = addQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      student.displayName.toLowerCase().includes(query) ||
      student.loginId.toLowerCase().includes(query)
    );
  });
  function toggleRemoveSelection(studentId: string) {
    setRemoveSelection((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }
  function removeSelected() {
    setMemberIds((current) =>
      current.filter((id) => !removeSelection.includes(id)),
    );
    setRemoveSelection([]);
  }
  function toggleAddSelection(studentId: string) {
    setAddSelection((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }
  function confirmAdd() {
    setMemberIds((current) => [...current, ...addSelection]);
    setAddSelection([]);
    setAddQuery("");
    setShowAddDialog(false);
  }
  function toggleAssignModule(versionId: string) {
    setAssignModuleVersionIds((current) =>
      current.includes(versionId)
        ? current.filter((id) => id !== versionId)
        : [...current, versionId],
    );
  }
  async function confirmAssign() {
    setAssignPending(true);
    setActionError("");
    try {
      const plan = assignModuleVersionIds.map((moduleVersionId) => ({
        moduleVersionId,
        targetKind: "group" as const,
        studentIds: [],
        groupId: currentGroupId,
        commonInstruction: assignInstruction,
      }));
      const { createdCount, failedCount } = await assignMany(plan);
      if (createdCount) {
        toast.success(
          failedCount
            ? `${createdCount}개의 학생별 카드를 만들었습니다. ${failedCount}건은 실패했습니다.`
            : `${createdCount}개의 학생별 카드를 만들었습니다.`,
        );
        setShowAssignDialog(false);
        setAssignModuleVersionIds([]);
        setAssignInstruction("");
      } else {
        setActionError(
          "카드를 만들지 못했습니다. 모듈과 현재 구성원을 확인하세요.",
        );
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "배정하지 못했습니다.";
      setActionError(`${message} 선택 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setAssignPending(false);
    }
  }
  async function deleteBatch(batchId: string) {
    const openCount = openCountForBatch(batchId);
    if (
      !window.confirm(
        `이 배정을 삭제할까요? 진행 중인 카드 ${openCount}건이 종료 처리되고, 기존 학습 이력은 보존됩니다.`,
      )
    )
      return;
    setActionPending(true);
    setActionError("");
    try {
      const { updatedCount, failedCount } = await closeBatch(batchId);
      toast.success(
        failedCount
          ? `${updatedCount}건을 삭제했습니다. ${failedCount}건은 실패했습니다.`
          : `${updatedCount}건을 삭제했습니다.`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "삭제하지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setActionPending(false);
    }
  }
  async function saveGroupDetails() {
    setActionPending(true);
    setActionError("");
    try {
      await updateGroup(currentGroupId, { name, description, memberIds });
      toast.success("그룹을 저장했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "그룹을 저장하지 못했습니다.";
      setActionError(`${message} 입력 내용은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setActionPending(false);
    }
  }
  async function changeArchiveState() {
    setActionPending(true);
    setActionError("");
    try {
      await archiveGroup(currentGroupId);
      toast.success(
        groupWasArchived ? "그룹을 복원했습니다." : "그룹을 보관했습니다.",
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "그룹 상태를 바꾸지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setActionPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="그룹 상세"
        title={group.name}
        description="구성원 변경은 이후 배정부터 적용되며 과거 카드는 바뀌지 않습니다."
        action={
          <Button
            variant="outline"
            onClick={changeArchiveState}
            disabled={actionPending}
            aria-busy={actionPending}
          >
            <Archive />
            {actionPending ? "처리 중…" : group.isArchived ? "복원" : "보관"}
          </Button>
        }
      />
      {actionError ? (
        <InlineMessage
          kind="error"
          title="그룹 작업을 완료하지 못했습니다"
          description={actionError}
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">그룹 정보와 구성원</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              label="그룹 시작일"
              value={
                earliestStart
                  ? `${formatDate(earliestStart)} · 구성원 중 가장 먼저 배정된 시점`
                  : "아직 배정 이력이 없습니다"
              }
            />
            <div className="space-y-2">
              <Label htmlFor="group-name">이름</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">설명</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <fieldset>
              <div className="mb-2 flex items-center justify-between gap-2">
                <legend className="text-sm font-medium">
                  현재 구성원 ({currentMembers.length}명)
                </legend>
                <div className="flex gap-2">
                  {removeSelection.length ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeSelected}
                    >
                      <UserMinus />
                      선택 삭제 ({removeSelection.length})
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus />
                    멤버 추가
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {currentMembers.length ? (
                  currentMembers.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={removeSelection.includes(student.id)}
                        onChange={() => toggleRemoveSelection(student.id)}
                      />
                      {student.displayName}
                      <span className="ml-auto text-xs text-muted-foreground">
                        @{student.loginId}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    구성원이 없습니다. &ldquo;멤버 추가&rdquo;로 학생을 더해
                    주세요.
                  </p>
                )}
              </div>
            </fieldset>
            <Button
              className="w-full"
              onClick={saveGroupDetails}
              disabled={actionPending}
              aria-busy={actionPending}
            >
              {actionPending ? "저장 중…" : "변경 저장"}
            </Button>
          </CardContent>
        </Card>
        <Dialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setAddSelection([]);
              setAddQuery("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>멤버 추가</DialogTitle>
              <DialogDescription>
                이름 또는 아이디로 검색해서 추가할 학생을 선택하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="group-member-search">학생 검색</Label>
              <Input
                id="group-member-search"
                value={addQuery}
                onChange={(event) => setAddQuery(event.target.value)}
                placeholder="예: 김민지 또는 minji"
                autoFocus
              />
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {addCandidates.length ? (
                addCandidates.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={addSelection.includes(student.id)}
                      onChange={() => toggleAddSelection(student.id)}
                    />
                    {student.displayName}
                    <span className="ml-auto text-xs text-muted-foreground">
                      @{student.loginId}
                    </span>
                  </label>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={!addSelection.length}
                onClick={confirmAdd}
              >
                {addSelection.length}명 추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">그룹 배정</CardTitle>
            <CardDescription>배정 당시 대상 인원을 표시합니다.</CardDescription>
            <CardAction>
              <Button
                size="sm"
                onClick={() => {
                  setActionError("");
                  setShowAssignDialog(true);
                }}
              >
                <Plus />
                모듈 배정
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.length ? (
              batches.map((batch) => {
                const version = state.versions.find(
                  (item) => item.id === batch.moduleVersionId,
                );
                const openCount = openCountForBatch(batch.id);
                return (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <Link
                      href={`/admin/assignments/batch/${batch.id}`}
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <p className="text-sm font-medium [overflow-wrap:anywhere]">
                        {version?.snapshot.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(batch.assignedAt)} · 당시{" "}
                        {batch.recipientCount}명
                        {openCount
                          ? ` · 진행 중 ${openCount}명`
                          : " · 모두 종료됨"}
                      </p>
                    </Link>
                    {openCount ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionPending}
                        aria-busy={actionPending}
                        onClick={() => deleteBatch(batch.id)}
                      >
                        <Trash2 />
                        {actionPending ? "삭제 중…" : "삭제"}
                      </Button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                그룹 배정 이력이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
        <Dialog
          open={showAssignDialog}
          onOpenChange={(open) => {
            setShowAssignDialog(open);
            if (!open) {
              setAssignModuleVersionIds([]);
              setAssignInstruction("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>모듈 배정</DialogTitle>
              <DialogDescription>
                게시된 모듈을 선택해 이 그룹의 현재 구성원에게 배정합니다. 여러
                개를 한 번에 선택할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            {activeModules.length ? (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {activeModules.map((module) => {
                  const alreadyOpen = hasOpenBatchForModule(
                    module.currentVersionId!,
                  );
                  return (
                    <label
                      key={module.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={assignModuleVersionIds.includes(
                          module.currentVersionId!,
                        )}
                        onChange={() =>
                          toggleAssignModule(module.currentVersionId!)
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block [overflow-wrap:anywhere]">
                          {module.draft.title}
                        </span>
                        {alreadyOpen ? (
                          <span className="block text-xs font-medium text-foreground">
                            이미 배정됨
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                발행된 모듈이 없습니다.
              </p>
            )}
            <Textarea
              value={assignInstruction}
              onChange={(event) => setAssignInstruction(event.target.value)}
              placeholder="공통 안내 (선택)"
            />
            {actionError ? (
              <InlineMessage
                kind="error"
                title="카드를 배정하지 못했습니다"
                description={actionError}
              />
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={assignPending || !assignModuleVersionIds.length}
                aria-busy={assignPending}
                onClick={confirmAssign}
              >
                {assignPending
                  ? "배정 중…"
                  : `${assignModuleVersionIds.length}개 모듈 배정`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

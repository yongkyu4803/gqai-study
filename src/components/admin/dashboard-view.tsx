"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  UsersRound,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader, StatusBadge } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/domain/status";

export function AdminDashboardView() {
  const { state, session } = useApp();
  const students = state.profiles.filter(
    (item) => item.role === "student" && item.isActive,
  );
  const waiting = state.assignments.filter(
    (item) =>
      item.assignmentStatus === "submitted" ||
      item.assignmentStatus === "resubmitted",
  );
  const active = state.assignments.filter(
    (item) =>
      item.assignmentStatus !== "completed" &&
      item.assignmentStatus !== "cancelled" &&
      item.assignmentStatus !== "stopped",
  );
  const revisionRequested = state.assignments.filter(
    (item) => item.assignmentStatus === "revision_requested",
  );
  const completed = state.assignments.filter(
    (item) => item.assignmentStatus === "completed",
  );
  return (
    <div className="space-y-7">
      <PageHeader
        title={`${session?.displayName ?? "강사"}님, 오늘도 이어가 볼까요?`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={UsersRound} label="활성 학생" value={students.length} />
        <Metric icon={BookOpen} label="진행 중 카드" value={active.length} />
        <Metric
          icon={Clock3}
          label="검토 대기"
          value={waiting.length}
          emphasis
        />
        <Metric
          icon={BookOpen}
          label="재제출 대기"
          value={revisionRequested.length}
        />
        <Metric
          icon={CheckCircle2}
          label="최종 완료"
          value={completed.length}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">먼저 검토할 제출</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/reviews" />}
            >
              전체 보기
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {waiting.length ? (
              waiting.slice(0, 5).map((assignment) => {
                const student = state.profiles.find(
                  (item) => item.id === assignment.studentId,
                );
                const version = state.versions.find(
                  (item) => item.id === assignment.moduleVersionId,
                );
                return (
                  <Link
                    key={assignment.id}
                    href={`/admin/assignments/${assignment.id}`}
                    className="flex items-center gap-3 rounded-lg border p-4 hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium [overflow-wrap:anywhere]">
                        {version?.snapshot.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {student?.displayName} ·{" "}
                        {formatDate(assignment.updatedAt, true)}
                      </p>
                    </div>
                    <StatusBadge value={assignment.assignmentStatus} />
                  </Link>
                );
              })
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                검토할 제출이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">빠른 작업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Quick href="/admin/modules/new" label="새 실습 모듈 만들기" />
            <Quick href="/admin/students/new" label="학생 계정 발급하기" />
            <Quick href="/admin/groups" label="학습 그룹 관리하기" />
            <Quick href="/admin/assignments" label="전체 진행 현황 보기" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  emphasis = false,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <Card className={emphasis ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon
            className={
              emphasis ? "size-4 text-foreground" : "size-4 text-[#9a9a9a]"
            }
          />
        </div>
        <p className="mt-2 text-2xl font-medium tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-zinc-50"
    >
      {label}
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

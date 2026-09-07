"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/app-provider";
import { EmptyState, PageHeader } from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/domain/status";
import {
  aiToolOptions,
  learningGoalOptions,
  osOptions,
} from "@/lib/domain/survey";

function labelFor<T extends string | number>(
  options: { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

export function SurveysView() {
  const { state } = useApp();
  const students = state.profiles.filter((item) => item.role === "student");
  const responses = state.surveyResponses ?? [];
  const rows = students
    .map((student) => ({
      student,
      response: responses.find((item) => item.studentId === student.id),
    }))
    .sort((a, b) => {
      if (!a.response && !b.response) return a.student.displayName.localeCompare(b.student.displayName);
      if (!a.response) return -1;
      if (!b.response) return 1;
      return b.response.submittedAt.localeCompare(a.response.submittedAt);
    });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생 관리"
        title="사전 설문"
        description="배정 전 학생의 환경·경험·활용 수준을 확인합니다."
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        학생 {students.length}명 중 {responses.length}명 응답
      </p>
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {rows.map(({ student, response }) => (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="grid gap-3 p-4 hover:bg-zinc-50 sm:grid-cols-[1fr_100px_1fr_140px_120px] sm:items-center"
              >
                <p className="font-medium">{student.displayName}</p>
                {response ? (
                  <>
                    <Badge variant="outline" className="w-fit font-normal">
                      {labelFor(osOptions, response.answers.os)}
                    </Badge>
                    <p className="truncate text-sm text-muted-foreground">
                      {response.answers.aiTools
                        .map((tool) => labelFor(aiToolOptions, tool))
                        .join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {response.answers.aiSkillLevel}단계 ·{" "}
                      {labelFor(learningGoalOptions, response.answers.learningGoal)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(response.submittedAt)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground sm:col-span-4">
                    아직 응답하지 않았습니다.
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="학생이 없습니다"
          description="학생 계정이 생기면 여기에 설문 응답이 모입니다."
        />
      )}
    </div>
  );
}

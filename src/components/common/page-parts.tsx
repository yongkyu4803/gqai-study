import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GqaiIcon } from "@/components/common/gqai-icon";
import type {
  AssignmentStatus,
  LearningStatus,
  ModuleStatus,
} from "@/lib/domain/types";
import {
  assignmentStatusLabel,
  learningStatusLabel,
  moduleStatusLabel,
} from "@/lib/domain/status";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-medium tracking-[-0.025em] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

const activeStatuses = new Set([
  "active",
  "course_completed",
  "completed",
  "feedback_given",
]);
const archivedStatuses = new Set(["archived", "cancelled", "stopped"]);

export function StatusBadge({
  value,
  kind = "assignment",
}: {
  value: AssignmentStatus | LearningStatus | ModuleStatus;
  kind?: "assignment" | "learning" | "module";
}) {
  const labels =
    kind === "module"
      ? moduleStatusLabel
      : kind === "learning"
        ? learningStatusLabel
        : assignmentStatusLabel;
  const label = labels[value as keyof typeof labels];
  const known = Boolean(label);
  const archived = known && archivedStatuses.has(value);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2 font-normal",
        archived && "border-[#1c1c1c] bg-[#1c1c1c] text-white",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full bg-[#9a9a9a]",
          known && activeStatuses.has(value) && "bg-primary",
          archived && "bg-white",
        )}
      />
      {label ?? "상태 미확인"}
    </Badge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-10 items-center justify-center rounded-md border bg-muted text-foreground">
          <GqaiIcon name="status-unknown" className="size-8" />
        </div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function InlineMessage({
  kind = "info",
  title,
  description,
  action,
  className,
  id,
}: {
  kind?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  const icon =
    kind === "success"
      ? "status-success"
      : kind === "warning"
        ? "status-warning"
        : kind === "error"
          ? "status-error"
          : "status-info";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      id={id}
      className={cn(
        "flex items-start gap-3 rounded-md border bg-muted px-4 py-3 text-sm",
        kind === "success" && "border-primary bg-accent",
        className,
      )}
    >
      <GqaiIcon name={icon} className="mt-0.5 size-5" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mt-1 leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div className="content-wrap space-y-6 py-8">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

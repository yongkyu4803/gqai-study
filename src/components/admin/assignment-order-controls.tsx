"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";

export function AssignmentOrderControls({
  kind,
  targetId,
  rows,
}: {
  kind: "student" | "group";
  targetId: string;
  rows: { id: string; title: string }[];
}) {
  const { reorderAssignments } = useApp();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  async function move(index: number, delta: number) {
    const ids = rows.map((r) => r.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setPending(true);
    try {
      await reorderAssignments(kind, targetId, ids);
      toast.success("카드 순서를 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "순서를 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }
  if (rows.length < 2) return null;
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setEditing(!editing)}
      >
        {editing ? "순서 편집 닫기" : "카드 순서 변경"}
      </Button>
      {editing ? (
        <div className="rounded-lg border p-3" aria-busy={pending}>
          <p className="mb-3 text-xs text-muted-foreground">
            위·아래 버튼으로 이동하면 바로 저장되며 학생 학습 화면에도
            반영됩니다.
          </p>
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1 text-sm">
                {index + 1}. {row.title}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={pending || index === 0}
                aria-label={`${row.title} 위로 이동`}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={pending || index === rows.length - 1}
                aria-label={`${row.title} 아래로 이동`}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

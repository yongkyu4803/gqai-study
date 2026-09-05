"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";

export function AssignmentOrderControls({
  kind,
  targetId,
  rows,
  children,
}: {
  kind: "student" | "group";
  targetId: string;
  rows: { id: string; title: string }[];
  children: ReactNode;
}) {
  const { reorderAssignments } = useApp();
  const [pending, setPending] = useState(false);
  const [drag, setDrag] = useState<{ id: string; slot: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    slot: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const cards = Children.toArray(children);

  async function save(id: string, slot: number) {
    const ids = rows.map((row) => row.id);
    const from = ids.indexOf(id);
    const to = slot > from ? slot - 1 : slot;
    if (from < 0 || from === to || saving.current) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    saving.current = true;
    setPending(true);
    try {
      await reorderAssignments(kind, targetId, ids);
      toast.success("카드 순서를 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "순서를 저장하지 못했습니다.",
      );
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  function cancel() {
    dragRef.current = null;
    setDrag(null);
  }
  if (!rows.length) return <>{children}</>;
  return (
    <div ref={listRef} className="space-y-2" aria-busy={pending}>
      {rows.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          왼쪽 손잡이를 끌어 카드 순서를 바꿀 수 있습니다.
        </p>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={row.id}
          data-sortable-card
          className={`relative flex items-center gap-1 rounded-lg transition-opacity ${drag?.id === row.id ? "bg-zinc-100 opacity-40" : ""}`}
        >
          {drag?.slot === index ? (
            <div className="pointer-events-none absolute -top-1.5 right-0 left-0 h-0.5 rounded bg-blue-500" />
          ) : null}
          {rows.length > 1 ? (
            <button
              type="button"
              aria-label={`${row.title} 순서 이동`}
              aria-describedby={`order-help-${kind}-${targetId}`}
              disabled={pending}
              className="flex min-h-11 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-500 active:cursor-grabbing disabled:opacity-30"
              onPointerDown={(event) => {
                if (event.button !== 0 || saving.current) return;
                event.preventDefault();
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  id: row.id,
                  slot: index,
                  startY: event.clientY,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const current = dragRef.current;
                if (
                  !current ||
                  (Math.abs(event.clientY - current.startY) < 5 &&
                    !current.moved)
                )
                  return;
                current.moved = true;
                const elements = Array.from(
                  listRef.current?.querySelectorAll("[data-sortable-card]") ??
                    [],
                );
                const slot = elements.findIndex((element) => {
                  const bounds = element.getBoundingClientRect();
                  return event.clientY < bounds.top + bounds.height / 2;
                });
                current.slot = slot < 0 ? rows.length : slot;
                setDrag({ id: current.id, slot: current.slot });
                if (event.clientY < 80) window.scrollBy(0, -16);
                else if (event.clientY > window.innerHeight - 80)
                  window.scrollBy(0, 16);
              }}
              onPointerUp={(event) => {
                const current = dragRef.current;
                cancel();
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
                if (current?.moved) void save(current.id, current.slot);
              }}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  cancel();
                  return;
                }
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                  return;
                event.preventDefault();
                if (dragRef.current) return;
                if (event.key === "ArrowUp" && index > 0)
                  void save(row.id, index - 1);
                if (event.key === "ArrowDown" && index < rows.length - 1)
                  void save(row.id, index + 2);
              }}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">{cards[index]}</div>
          {drag?.slot === rows.length && index === rows.length - 1 ? (
            <div className="pointer-events-none absolute -bottom-1.5 right-0 left-0 h-0.5 rounded bg-blue-500" />
          ) : null}
        </div>
      ))}
      <span id={`order-help-${kind}-${targetId}`} className="sr-only">
        손잡이를 끌어 원하는 위치에 놓으세요. 키보드 위아래 방향키로도 이동할 수
        있습니다. Escape 키로 드래그를 취소합니다.
      </span>
      <span className="sr-only" role="status">
        {pending ? "카드 순서 저장 중" : drag ? "카드 이동 중" : ""}
      </span>
    </div>
  );
}

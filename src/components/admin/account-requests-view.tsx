"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/domain/status";

interface AccountRequest {
  id: string;
  displayName: string;
  requestedLoginId: string | null;
  contact: string;
  note: string | null;
  status: "pending" | "approved" | "dismissed";
  createdAt: string;
}

const statusLabel: Record<AccountRequest["status"], string> = {
  pending: "대기",
  approved: "발급 완료",
  dismissed: "무시함",
};

export function AccountRequestsView() {
  const router = useRouter();
  const [requests, setRequests] = useState<AccountRequest[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/account-requests");
    if (!response.ok) {
      toast.error("요청 목록을 불러오지 못했습니다.");
      return;
    }
    const body = await response.json();
    setRequests(body.requests);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount from the server, not a render-triggered cascade
    load();
  }, []);

  async function resolve(id: string, status: "approved" | "dismissed") {
    setPendingId(id);
    try {
      const response = await fetch(`/api/admin/account-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      toast.error("요청을 처리하지 못했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="계정 관리"
        title="계정 요청"
        description="랜딩 페이지에서 접수된 계정 발급 요청입니다."
      />
      {requests === null ? null : requests.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {requests.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-center"
              >
                <div>
                  <p className="font-medium">{item.displayName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.requestedLoginId ? `@${item.requestedLoginId} · ` : ""}
                    {item.contact}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.note || "메모 없음"}
                  <span className="mt-1 block text-xs">
                    {formatDate(item.createdAt)}
                  </span>
                </p>
                <Badge
                  variant={item.status === "pending" ? "outline" : "secondary"}
                  className="w-fit"
                >
                  {statusLabel[item.status]}
                </Badge>
                {item.status === "pending" ? (
                  <div className="flex gap-2 justify-self-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => resolve(item.id, "dismissed")}
                    >
                      무시
                    </Button>
                    <Button
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={async () => {
                        await resolve(item.id, "approved");
                        const params = new URLSearchParams({
                          displayName: item.displayName,
                          loginId: item.requestedLoginId || "",
                          email: item.contact,
                        });
                        router.push(`/admin/students/new?${params.toString()}`);
                      }}
                    >
                      계정 발급하기
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="접수된 요청이 없습니다"
          description="랜딩 페이지의 계정 발급 요청 폼으로 접수된 내용이 여기 표시됩니다."
        />
      )}
    </div>
  );
}

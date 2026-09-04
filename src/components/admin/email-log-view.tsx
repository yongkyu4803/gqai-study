"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/domain/status";

interface EmailLog {
  id: string;
  kind: "assignment" | "account_request" | "feedback";
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  createdAt: string;
}

const kindLabel: Record<EmailLog["kind"], string> = {
  assignment: "배정 알림",
  account_request: "계정 요청",
  feedback: "피드백 알림",
};

export function EmailLogView() {
  const [logs, setLogs] = useState<EmailLog[] | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/notifications/log");
      if (!response.ok) {
        toast.error("발송 로그를 불러오지 못했습니다.");
        return;
      }
      const body = await response.json();
      setLogs(body.logs);
    }
    load();
  }, []);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="계정 관리"
        title="이메일 발송 로그"
        description="배정·피드백·계정 요청 알림 메일의 발송 성공·실패 기록입니다."
      />
      {logs === null ? null : logs.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {logs.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 p-4 sm:grid-cols-[100px_1fr_90px_auto] sm:items-center"
              >
                <Badge variant="outline" className="w-fit font-normal">
                  {kindLabel[item.kind]}
                </Badge>
                <div>
                  <p className="font-medium">{item.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.recipientEmail}
                    {item.errorMessage ? ` · ${item.errorMessage}` : ""}
                  </p>
                </div>
                <Badge
                  variant={item.status === "sent" ? "outline" : "secondary"}
                  className="w-fit"
                >
                  {item.status === "sent" ? "발송됨" : "실패"}
                </Badge>
                <span className="text-xs text-muted-foreground justify-self-end">
                  {formatDate(item.createdAt, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="발송 기록이 없습니다"
          description="배정, 피드백, 계정 요청 알림 메일이 발송되면 여기 기록됩니다."
        />
      )}
    </div>
  );
}

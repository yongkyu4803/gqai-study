"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GqaiIcon } from "@/components/common/gqai-icon";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="content-wrap flex min-h-[60dvh] items-center justify-center text-center">
      <div>
        <GqaiIcon name="status-error" className="mx-auto size-10" />
        <h1 className="mt-4 text-2xl font-medium">
          화면을 불러오지 못했습니다
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          입력한 내용은 가능한 한 유지됩니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button className="mt-5" onClick={reset}>
          다시 시도
        </Button>
      </div>
    </main>
  );
}

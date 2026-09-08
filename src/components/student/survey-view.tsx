"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { InlineMessage, PageHeader } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { SurveyFields } from "@/components/common/survey-fields";
import { createEmptySurveyAnswers } from "@/lib/domain/survey";
import type { SurveyAnswers } from "@/lib/domain/types";

export function SurveyView() {
  const router = useRouter();
  const { session, state, submitSurvey } = useApp();
  const existing = (state.surveyResponses ?? []).find(
    (item) => item.studentId === session?.id,
  );
  const [answers, setAnswers] = useState<SurveyAnswers>(
    existing?.answers ?? createEmptySurveyAnswers(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await submitSurvey(answers);
      toast.success("설문을 제출했습니다. 감사합니다!");
      router.replace("/learn");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "제출하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeader
        eyebrow="시작 전 설문"
        title="지금 어떤 상태인지 알려주세요"
        description="정답은 없습니다. 지금 상태를 정확히 알수록 나에게 맞는 학습 카드를 배정받을 수 있습니다."
      />
      <form onSubmit={submit} className="space-y-6">
        {error ? (
          <InlineMessage
            kind="error"
            title="설문을 제출하지 못했습니다"
            description={error}
          />
        ) : null}

        <SurveyFields answers={answers} setAnswers={setAnswers} />

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={pending || !answers.aiTools.length}
          aria-busy={pending}
        >
          {pending ? "제출 중…" : existing ? "다시 제출" : "제출하고 시작하기"}
        </Button>
      </form>
    </div>
  );
}

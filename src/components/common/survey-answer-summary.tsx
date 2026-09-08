import { Badge } from "@/components/ui/badge";
import {
  SURVEY_TOOLS,
  aiToolOptions,
  learningGoalOptions,
  osOptions,
  skillLevelOptions,
  toolFamiliarityOptions,
  toolLabels,
  usageFrequencyOptions,
} from "@/lib/domain/survey";
import type { SurveyAnswers } from "@/lib/domain/types";

function labelFor<T extends string | number>(
  options: { value: T; label: string }[],
  value: T,
) {
  return (
    options.find((option) => option.value === value)?.label ?? String(value)
  );
}

export function SurveyAnswerSummary({ answers }: { answers: SurveyAnswers }) {
  return (
    <div className="space-y-3 text-sm">
      <Row
        label="운영체제"
        value={
          answers.os === "other"
            ? answers.osDetail || "기타"
            : labelFor(osOptions, answers.os)
        }
      />
      <Row
        label="주로 쓰는 AI"
        value={
          answers.aiTools
            .map((tool) => labelFor(aiToolOptions, tool))
            .join(", ") || "응답 없음"
        }
      />
      <Row label="유료 구독" value={answers.aiSubscription || "없음"} />
      {answers.aiToolsDetail ? (
        <Row label="기타 AI 도구" value={answers.aiToolsDetail} />
      ) : null}
      <Row
        label="사용 빈도"
        value={labelFor(usageFrequencyOptions, answers.aiUsageFrequency)}
      />
      <div className="border-b py-2 last:border-0">
        <p className="mb-2 text-muted-foreground">서비스 숙련도</p>
        <div className="flex flex-wrap gap-1.5">
          {SURVEY_TOOLS.map((tool) => (
            <Badge key={tool} variant="outline" className="font-normal">
              {toolLabels[tool]} ·{" "}
              {labelFor(
                toolFamiliarityOptions,
                answers.toolFamiliarity[tool] ?? "none",
              )}
            </Badge>
          ))}
        </div>
      </div>
      <Row
        label="활용 수준"
        value={`${answers.aiSkillLevel}단계 · ${labelFor(skillLevelOptions, answers.aiSkillLevel)}`}
      />
      <div className="border-b py-2 last:border-0">
        <p className="text-muted-foreground">구체적인 활용 방식</p>
        <p className="mt-1 [overflow-wrap:anywhere]">{answers.aiSkillDetail}</p>
      </div>
      <Row
        label="학습 목표"
        value={labelFor(learningGoalOptions, answers.learningGoal)}
      />
      {answers.learningGoalDetail ? (
        <div className="border-b py-2 last:border-0">
          <p className="text-muted-foreground">목표 상세</p>
          <p className="mt-1 [overflow-wrap:anywhere]">
            {answers.learningGoalDetail}
          </p>
        </div>
      ) : null}
      {answers.priorEducation ? (
        <Row label="이전 교육 경험" value={answers.priorEducation} />
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-2 last:border-0 sm:grid-cols-[140px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

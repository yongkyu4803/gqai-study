"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { SurveyAnswers, SurveyAiTool } from "@/lib/domain/types";

export function SurveyFields({
  answers,
  setAnswers,
}: {
  answers: SurveyAnswers;
  setAnswers: Dispatch<SetStateAction<SurveyAnswers>>;
}) {
  function toggleAiTool(tool: SurveyAiTool) {
    setAnswers((prev) => ({
      ...prev,
      aiTools: prev.aiTools.includes(tool)
        ? prev.aiTools.filter((item) => item !== tool)
        : tool === "none"
          ? ["none"]
          : [...prev.aiTools.filter((item) => item !== "none"), tool],
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사용 환경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">운영체제</legend>
            <div className="flex flex-wrap gap-2">
              {osOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="os"
                    checked={answers.os === option.value}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, os: option.value }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {answers.os === "other" ? (
            <Input
              aria-label="기타 운영체제"
              value={answers.osDetail ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, osDetail: e.target.value }))
              }
              placeholder="사용 중인 운영체제를 적어주세요"
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 챗봇 사용 경험</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              주로 쓰는 AI (복수 선택 가능)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {aiToolOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={answers.aiTools.includes(option.value)}
                    onChange={() => toggleAiTool(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {answers.aiTools.includes("other") ? (
            <div className="space-y-2">
              <Label htmlFor="ai-tools-detail">기타 AI 도구</Label>
              <Input
                id="ai-tools-detail"
                value={answers.aiToolsDetail ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    aiToolsDetail: event.target.value,
                  }))
                }
                maxLength={200}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ai-subscription">
              유료 구독 여부 (있다면 어떤 플랜인지)
            </Label>
            <Input
              id="ai-subscription"
              value={answers.aiSubscription}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  aiSubscription: e.target.value,
                }))
              }
              placeholder="예: ChatGPT Plus, 없음"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">사용 빈도</legend>
            <div className="flex flex-wrap gap-2">
              {usageFrequencyOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="aiUsageFrequency"
                    checked={answers.aiUsageFrequency === option.value}
                    onChange={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        aiUsageFrequency: option.value,
                      }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">주요 서비스 숙련도</CardTitle>
          <CardDescription>
            안 써봤어도 괜찮습니다. 있는 그대로 선택해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SURVEY_TOOLS.map((tool) => (
            <div
              key={tool}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <span className="text-sm font-medium">{toolLabels[tool]}</span>
              <div className="flex flex-wrap gap-1">
                {toolFamiliarityOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="radio"
                      name={`familiarity-${tool}`}
                      checked={answers.toolFamiliarity[tool] === option.value}
                      onChange={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          toolFamiliarity: {
                            ...prev.toolFamiliarity,
                            [tool]: option.value,
                          },
                        }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 활용 수준</CardTitle>
          <CardDescription>
            지금 나와 가장 가까운 단계를 선택해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {skillLevelOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="aiSkillLevel"
                  className="mt-1"
                  checked={answers.aiSkillLevel === option.value}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      aiSkillLevel: option.value,
                    }))
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-skill-detail">
              구체적으로 어떻게 활용하고 계신가요?
            </Label>
            <Textarea
              id="ai-skill-detail"
              value={answers.aiSkillDetail}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  aiSkillDetail: e.target.value,
                }))
              }
              placeholder="예: 구글 검색 대신 원하는 정보를 자세히 물어보는 정도로 씁니다. 스킬이나 MCP는 아직 잘 모릅니다."
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">학습 목표</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {learningGoalOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="learningGoal"
                  checked={answers.learningGoal === option.value}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      learningGoal: option.value,
                    }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-detail">
              조금 더 자세히 알려주세요 (선택)
            </Label>
            <Textarea
              id="goal-detail"
              value={answers.learningGoalDetail}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  learningGoalDetail: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prior-education">
              관련 강의·부트캠프 수강 경험이 있다면 알려주세요 (선택)
            </Label>
            <Input
              id="prior-education"
              value={answers.priorEducation ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  priorEducation: e.target.value,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

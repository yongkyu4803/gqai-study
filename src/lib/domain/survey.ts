import { z } from "zod";
import type {
  SurveyAiTool,
  SurveyLearningGoal,
  SurveyOsChoice,
  SurveyToolFamiliarity,
  SurveyUsageFrequency,
} from "./types";

export const SURVEY_TOOLS = [
  "notion",
  "google_workspace",
  "excel",
  "slack",
  "github",
  "figma",
] as const;
export type SurveyToolKey = (typeof SURVEY_TOOLS)[number];

export const osOptions: { value: SurveyOsChoice; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "other", label: "기타" },
];

export const aiToolOptions: { value: SurveyAiTool; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" },
  { value: "other", label: "기타" },
  { value: "none", label: "사용 안 함" },
];

export const usageFrequencyOptions: { value: SurveyUsageFrequency; label: string }[] = [
  { value: "daily", label: "거의 매일" },
  { value: "weekly", label: "주 몇 회" },
  { value: "rarely", label: "가끔" },
];

export const toolFamiliarityOptions: { value: SurveyToolFamiliarity; label: string }[] = [
  { value: "none", label: "안 써봄" },
  { value: "some", label: "가끔 씀" },
  { value: "proficient", label: "능숙함" },
];

export const toolLabels: Record<SurveyToolKey, string> = {
  notion: "Notion",
  google_workspace: "Google 문서/스프레드시트",
  excel: "Excel",
  slack: "Slack",
  github: "Github",
  figma: "Figma",
};

export const skillLevelOptions: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "거의 안 써봄" },
  { value: 2, label: "검색 대신 질문하는 정도" },
  { value: 3, label: "프롬프트를 구체적으로 써서 원하는 결과를 잘 뽑아냄 (예: 고급 구글 검색처럼 활용)" },
  { value: 4, label: "반복 작업을 자동화하거나 여러 단계로 연결해서 씀" },
  { value: 5, label: "API·MCP·Skill·에이전트 같은 확장 기능을 직접 써보거나 만들어봄" },
];

export const learningGoalOptions: { value: SurveyLearningGoal; label: string }[] = [
  { value: "automation", label: "반복 업무에 쓰는 시간을 줄이고 싶어요" },
  { value: "side_project", label: "관심 있는 것을 직접 만들어보고 싶어요" },
  { value: "group_project", label: "함께 배우며 프로젝트를 키우고 싶어요" },
  { value: "other", label: "기타" },
];

export const surveyAnswersSchema = z.object({
  os: z.enum(["windows", "macos", "other"]),
  osDetail: z.string().trim().max(100).optional(),
  aiTools: z.array(z.enum(["chatgpt", "claude", "gemini", "perplexity", "other", "none"])).min(1, "하나 이상 선택하세요."),
  aiToolsDetail: z.string().trim().max(200).optional(),
  aiSubscription: z.string().trim().max(200),
  aiUsageFrequency: z.enum(["daily", "weekly", "rarely"]),
  toolFamiliarity: z.record(z.string(), z.enum(["none", "some", "proficient"])),
  aiSkillLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  aiSkillDetail: z.string().trim().min(1, "구체적으로 어떻게 활용하는지 적어주세요.").max(1000),
  learningGoal: z.enum(["automation", "side_project", "group_project", "other"]),
  learningGoalDetail: z.string().trim().max(500),
  priorEducation: z.string().trim().max(300).optional(),
});

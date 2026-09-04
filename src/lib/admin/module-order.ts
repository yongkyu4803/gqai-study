import type { ModuleTemplate } from "@/lib/domain/types";

export const ADMIN_MODULE_TITLES_IN_NOTION_ORDER = [
  "AI와 친해지기",
  "툴과 친해지기",
  "업무 해체하기",
  "HTML+CSS로 웹페이지 만들기",
  "자동화 기본기",
  "첫 배포",
  "음악 만들어보기",
  "스킬 익히기",
  "스킬 공유하기",
  "데이터베이스 입문",
  "웹크롤링",
] as const;

const adminModuleSequenceByTitle = new Map<string, number>(
  ADMIN_MODULE_TITLES_IN_NOTION_ORDER.map((title, index) => [title, index + 1]),
);

export function getAdminModuleSequence(title: string) {
  return adminModuleSequenceByTitle.get(title);
}

export function formatAdminModuleSequence(sequence: number) {
  return String(sequence).padStart(2, "0");
}

export function formatAdminModuleTitle(title: string) {
  const sequence = getAdminModuleSequence(title);
  return sequence ? `${formatAdminModuleSequence(sequence)}. ${title}` : title;
}

export function compareAdminModules(
  left: ModuleTemplate,
  right: ModuleTemplate,
) {
  const leftSequence = getAdminModuleSequence(left.draft.title);
  const rightSequence = getAdminModuleSequence(right.draft.title);

  if (leftSequence && rightSequence) return leftSequence - rightSequence;
  if (leftSequence) return -1;
  if (rightSequence) return 1;
  return left.draft.title.localeCompare(right.draft.title, "ko");
}

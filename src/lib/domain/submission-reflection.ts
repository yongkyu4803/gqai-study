import type { SubmissionItem } from "./types";

export interface SubmissionReflection {
  purpose: string;
  choice: string;
  result: string;
  nextStep: string;
}

export const EMPTY_SUBMISSION_REFLECTION: SubmissionReflection = {
  purpose: "",
  choice: "",
  result: "",
  nextStep: "",
};

const PREFIX = "[학습 회고]\n";
const SECTIONS = [
  ["purpose", "1. 나의 목적"],
  ["choice", "2. 내가 한 선택"],
  ["result", "3. 실행 결과"],
  ["nextStep", "4. 다음 단계"],
] as const;

export function serializeSubmissionReflection(
  reflection: SubmissionReflection,
) {
  return `${PREFIX}${SECTIONS.map(
    ([key, heading]) => `${heading}\n${reflection[key].trim()}`,
  ).join("\n\n")}`;
}

export function parseSubmissionReflection(text?: string) {
  if (!text?.startsWith(PREFIX)) return null;
  const reflection = { ...EMPTY_SUBMISSION_REFLECTION };
  for (let index = 0; index < SECTIONS.length; index += 1) {
    const [key, heading] = SECTIONS[index];
    const start = text.indexOf(`${heading}\n`);
    if (start < 0) return null;
    const valueStart = start + heading.length + 1;
    const nextHeading = SECTIONS[index + 1]?.[1];
    const valueEnd = nextHeading
      ? text.indexOf(`\n\n${nextHeading}\n`, valueStart)
      : text.length;
    reflection[key] = text
      .slice(valueStart, valueEnd < 0 ? text.length : valueEnd)
      .trim();
  }
  return reflection;
}

export function extractSubmissionReflection(items: SubmissionItem[]) {
  const item = items.find(
    (candidate) =>
      candidate.type === "text" && parseSubmissionReflection(candidate.text),
  );
  return {
    reflection: item
      ? parseSubmissionReflection(item.text)!
      : { ...EMPTY_SUBMISSION_REFLECTION },
    reflectionItemId: item?.id,
    evidenceItems: item
      ? items.filter((candidate) => candidate.id !== item.id)
      : items,
  };
}

export function missingSubmissionReflectionField(
  reflection: SubmissionReflection,
) {
  return SECTIONS.find(([key]) => !reflection[key].trim())?.[1] ?? null;
}

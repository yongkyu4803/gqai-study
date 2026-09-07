import { describe, expect, it } from "vitest";
import {
  EMPTY_SUBMISSION_REFLECTION,
  extractSubmissionReflection,
  missingSubmissionReflectionField,
  parseSubmissionReflection,
  serializeSubmissionReflection,
} from "./submission-reflection";

describe("submission reflection", () => {
  const reflection = {
    purpose: "반복 업무를 줄인다.",
    choice: "메일 정리를 선택했다.",
    result: "10분이 줄었다.",
    nextStep: "매일 자동 실행한다.",
  };

  it("round trips the four guided answers", () => {
    expect(
      parseSubmissionReflection(serializeSubmissionReflection(reflection)),
    ).toEqual(reflection);
    expect(
      parseSubmissionReflection(
        serializeSubmissionReflection(EMPTY_SUBMISSION_REFLECTION),
      ),
    ).toEqual(EMPTY_SUBMISSION_REFLECTION);
  });

  it("separates the reflection from evidence and preserves legacy items", () => {
    const legacy = { id: "file", type: "file" as const, order: 1 };
    const extracted = extractSubmissionReflection([
      {
        id: "reflection",
        type: "text",
        order: 0,
        text: serializeSubmissionReflection(reflection),
      },
      legacy,
    ]);
    expect(extracted.reflection).toEqual(reflection);
    expect(extracted.evidenceItems).toEqual([legacy]);
    expect(extractSubmissionReflection([legacy]).evidenceItems).toEqual([
      legacy,
    ]);
  });

  it("reports the first unanswered field", () => {
    expect(missingSubmissionReflectionField(EMPTY_SUBMISSION_REFLECTION)).toBe(
      "1. 나의 목적",
    );
    expect(missingSubmissionReflectionField(reflection)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { formatDate, formatFileSize } from "./status";

describe("상태 표시값", () => {
  it("누락, 잘못된 날짜, 측정된 0을 구분한다", () => {
    expect(formatDate()).toBe("— · 기록 없음");
    expect(formatDate("not-a-date")).toBe("확인 필요");
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("확인 필요");
  });
});

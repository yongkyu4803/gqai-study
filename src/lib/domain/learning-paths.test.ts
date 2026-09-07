import { describe, expect, it } from "vitest";
import {
  getLearningPaths,
  getSuggestedNextModuleTitles,
} from "./learning-paths";

describe("learning paths", () => {
  it("extracts only supported path tags", () => {
    expect(
      getLearningPaths(["자동화", "경로: 업무 효율화", "경로: 알 수 없음"]),
    ).toEqual(["업무 효율화"]);
  });

  it("suggests the immediate next module in every matching path", () => {
    expect(getSuggestedNextModuleTitles("업무 해체하기")).toEqual([
      "폴더 자료를 AI와 활용하기",
    ]);
    expect(getSuggestedNextModuleTitles("데이터베이스 입문")).toEqual([
      "웹크롤링",
    ]);
    expect(getSuggestedNextModuleTitles("스킬 익히기", ["공유·협업"])).toEqual([
      "스킬 공유하기",
    ]);
  });
});

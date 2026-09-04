import { describe, expect, it } from "vitest";
import notionModulesJson from "../../../content/notion-modules.json";
import type { ModuleSnapshot, ModuleTemplate } from "@/lib/domain/types";
import {
  ADMIN_MODULE_TITLES_IN_NOTION_ORDER,
  compareAdminModules,
  formatAdminModuleTitle,
  getAdminModuleSequence,
} from "./module-order";

const notionTitles = notionModulesJson.map(
  (module) => (module.snapshot as ModuleSnapshot).title,
);

function moduleWithTitle(title: string): ModuleTemplate {
  return {
    id: title,
    status: "active",
    draft: { ...(notionModulesJson[0].snapshot as ModuleSnapshot), title },
    createdBy: "admin",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("관리자용 모듈 순서", () => {
  it("노션 원본의 11개 순서를 그대로 사용한다", () => {
    expect(ADMIN_MODULE_TITLES_IN_NOTION_ORDER).toEqual(notionTitles);
    expect(notionTitles.map(getAdminModuleSequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it("관리자 제목에는 두 자리 번호를 붙이고 추가 모듈에는 붙이지 않는다", () => {
    expect(formatAdminModuleTitle("AI와 친해지기")).toBe("01. AI와 친해지기");
    expect(formatAdminModuleTitle("웹크롤링")).toBe("11. 웹크롤링");
    expect(formatAdminModuleTitle("추가 모듈")).toBe("추가 모듈");
  });

  it("노션 모듈을 먼저 정렬하고 추가 모듈을 뒤에 둔다", () => {
    const modules = [
      moduleWithTitle("추가 모듈"),
      moduleWithTitle("웹크롤링"),
      moduleWithTitle("AI와 친해지기"),
    ];

    expect(
      modules.sort(compareAdminModules).map((module) => module.draft.title),
    ).toEqual(["AI와 친해지기", "웹크롤링", "추가 모듈"]);
  });
});

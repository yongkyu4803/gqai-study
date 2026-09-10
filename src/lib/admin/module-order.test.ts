import { describe, expect, it } from "vitest";
import seedModulesJson from "../../../content/demo-seed-modules.generated.json";
import type { ModuleSnapshot, ModuleTemplate } from "@/lib/domain/types";
import {
  ADMIN_MODULE_TITLES_IN_SEED_ORDER,
  compareAdminModules,
  formatAdminModuleTitle,
  getAdminModuleSequence,
} from "./module-order";

const seedTitles = seedModulesJson.map(
  (module) => (module.snapshot as ModuleSnapshot).title,
);

function moduleWithTitle(title: string): ModuleTemplate {
  return {
    id: title,
    status: "active",
    draft: { ...(seedModulesJson[0].snapshot as ModuleSnapshot), title },
    createdBy: "admin",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("관리자용 모듈 순서", () => {
  it("데모 시드 순서를 그대로 사용한다", () => {
    expect(ADMIN_MODULE_TITLES_IN_SEED_ORDER).toEqual(seedTitles);
    expect(seedTitles.map(getAdminModuleSequence)).toEqual(
      seedTitles.map((_, index) => index + 1),
    );
  });

  it("시드 모듈에는 두 자리 번호를 붙이고 앱에서 만든 모듈에는 붙이지 않는다", () => {
    expect(formatAdminModuleTitle(seedTitles[0])).toBe(`01. ${seedTitles[0]}`);
    expect(formatAdminModuleTitle(seedTitles.at(-1) as string)).toBe(
      `${String(seedTitles.length).padStart(2, "0")}. ${seedTitles.at(-1)}`,
    );
    expect(formatAdminModuleTitle("추가 모듈")).toBe("추가 모듈");
  });

  it("시드 모듈을 먼저 정렬하고 앱에서 만든 모듈을 뒤에 둔다", () => {
    const modules = [
      moduleWithTitle("추가 모듈"),
      moduleWithTitle(seedTitles.at(-1) as string),
      moduleWithTitle(seedTitles[0]),
    ];

    expect(
      modules.sort(compareAdminModules).map((module) => module.draft.title),
    ).toEqual([seedTitles[0], seedTitles.at(-1), "추가 모듈"]);
  });
});

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import notionModulesJson from "../../../content/notion-modules.json";
import type { ModuleSnapshot } from "@/lib/domain/types";
import {
  isBundledModuleAssetUrl,
  isSafeAssetUrl,
  validateModuleSnapshot,
} from "@/lib/domain/validation";

interface NotionModuleSeed {
  id: string;
  versionId: string;
  sourceDate: string;
  snapshot: ModuleSnapshot;
}

const modules = notionModulesJson as NotionModuleSeed[];

describe("Notion 강의 모듈 seed", () => {
  it("11개 강의를 발행 가능한 스냅샷으로 제공한다", () => {
    expect(modules).toHaveLength(11);
    expect(new Set(modules.map((lesson) => lesson.id)).size).toBe(11);
    expect(new Set(modules.map((lesson) => lesson.snapshot.title)).size).toBe(
      11,
    );

    for (const lesson of modules) {
      expect(() =>
        validateModuleSnapshot(lesson.snapshot, { forPublish: true }),
      ).not.toThrow();
    }
  });

  it("노션 화면 자료 23개를 앱 내부의 안전한 경로로 연결한다", () => {
    const images = modules.flatMap((lesson) =>
      lesson.snapshot.blocks.filter((block) => block.type === "image"),
    );

    expect(images).toHaveLength(23);
    for (const image of images) {
      expect(isBundledModuleAssetUrl(image.asset?.url)).toBe(true);
      expect(isSafeAssetUrl(image.asset?.url)).toBe(true);
      const fileName = (image.asset?.url || "").split("/").at(-1) || "";
      expect(
        existsSync(join(process.cwd(), "content/notion-assets", fileName)),
      ).toBe(true);
    }
  });

  it("스킬 익히기 설정 이미지 3개를 모두 제공한다", () => {
    const lesson = modules.find(
      (module) => module.snapshot.title === "스킬 익히기",
    );
    const images = lesson?.snapshot.blocks.filter(
      (block) => block.type === "image",
    );

    expect(images?.map((image) => image.asset?.name)).toEqual([
      "skills-01.png",
      "skills-02.png",
      "skills-03.png",
    ]);
  });

  it("상대 경로 위장이나 외부 프로토콜을 번들 자산으로 허용하지 않는다", () => {
    expect(
      isBundledModuleAssetUrl("/api/module-assets/notion/../secret.png"),
    ).toBe(false);
    expect(
      isBundledModuleAssetUrl("//api/module-assets/notion/tools-01.png"),
    ).toBe(false);
    expect(isBundledModuleAssetUrl("javascript:alert(1)")).toBe(false);
  });
});

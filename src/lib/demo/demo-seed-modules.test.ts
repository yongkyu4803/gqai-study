import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import seedModulesJson from "../../../content/demo-seed-modules.generated.json";
import type { ModuleSnapshot } from "@/lib/domain/types";
import {
  isBundledModuleAssetUrl,
  isSafeAssetUrl,
  validateModuleSnapshot,
} from "@/lib/domain/validation";

interface DemoSeedModule {
  id: string;
  versionId: string;
  sourceDate: string;
  snapshot: ModuleSnapshot;
}

const SEED_PATH = join(
  process.cwd(),
  "content/demo-seed-modules.generated.json",
);
const LOCK_PATH = join(process.cwd(), "content/demo-seed-modules.lock");

const modules = seedModulesJson as DemoSeedModule[];

describe("데모 시드 모듈", () => {
  it("손으로 고친 흔적이 없다", () => {
    const checksum = createHash("sha256")
      .update(readFileSync(SEED_PATH, "utf8"))
      .digest("hex");
    const locked = readFileSync(LOCK_PATH, "utf8").trim();

    expect(
      checksum,
      [
        "content/demo-seed-modules.generated.json은 운영 DB에서 뽑아낸 생성물입니다.",
        "직접 고치지 마세요.",
        "",
        "  운영에 새 강의를 등록하려면:  npm run module:add -- <모듈파일.json>",
        "  강의 내용을 고치려면:          앱의 모듈 편집기",
        "  이 파일을 최신화하려면:        npm run seed:export",
        "",
      ].join("\n"),
    ).toBe(locked);
  });

  it("모든 강의를 발행 가능한 스냅샷으로 제공한다", () => {
    expect(modules.length).toBeGreaterThan(0);
    expect(new Set(modules.map((lesson) => lesson.id)).size).toBe(
      modules.length,
    );
    expect(new Set(modules.map((lesson) => lesson.versionId)).size).toBe(
      modules.length,
    );
    expect(new Set(modules.map((lesson) => lesson.snapshot.title)).size).toBe(
      modules.length,
    );

    for (const lesson of modules) {
      expect(() =>
        validateModuleSnapshot(lesson.snapshot, { forPublish: true }),
      ).not.toThrow();
    }
  });

  it("모든 화면 자료를 앱 내부의 안전한 경로로 연결한다", () => {
    const images = modules.flatMap((lesson) =>
      lesson.snapshot.blocks.filter((block) => block.type === "image"),
    );

    expect(images.length).toBeGreaterThan(0);
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

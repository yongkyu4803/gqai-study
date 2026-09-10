// 운영 DB의 발행 모듈을 데모 시드 파일로 다시 뽑아냅니다.
// 원본은 운영 DB이고, content/demo-seed-modules.generated.json은 생성물입니다.
// 이 파일을 손으로 고치지 마세요. 고치면 테스트가 잠금값 불일치로 실패합니다.
import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ASSET_BUCKET,
  ASSET_URL_PREFIX,
  bundledAssetFileUrl,
  comparableRow,
  createServiceClient,
  listAdminModules,
  readPublishedVersion,
  readSeedModules,
  resolveAdmin,
  SEED_FILE,
  writeSeedLock,
} from "./lib/module-sync.mjs";

function shortId(templateId) {
  return templateId.replace(/-/g, "").slice(0, 8);
}

async function ensureBundledAsset(client, storagePath, assetUrl) {
  const target = bundledAssetFileUrl(assetUrl);
  try {
    await access(fileURLToPath(target));
    return;
  } catch {
    // 아래에서 내려받는다.
  }
  const { data, error } = await client.storage
    .from(ASSET_BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(
      `자산 내려받기 실패 (${storagePath}): ${error?.message || "결과 없음"}`,
    );
  }
  await writeFile(fileURLToPath(target), Buffer.from(await data.arrayBuffer()));
  process.stdout.write(
    `  자산 내려받음: ${assetUrl.slice(ASSET_URL_PREFIX.length)}\n`,
  );
}

// Postgres jsonb는 키 순서를 보존하지 않는다. 내보낼 때마다 순서가 흔들려
// 의미 없는 diff가 생기지 않도록 고정된 순서로 다시 쓴다.
const BLOCK_KEYS = ["id", "type", "text", "checked", "url", "language"];
const ASSET_KEYS = ["id", "name", "size", "mimeType", "url", "storagePath"];

function canonical(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  for (const key of Object.keys(source).sort()) {
    if (!(key in result)) result[key] = source[key];
  }
  return result;
}

async function toSeedBlocks(client, blocks) {
  const result = [];
  for (const block of blocks) {
    if (!block.asset) {
      result.push(canonical(block, BLOCK_KEYS));
      continue;
    }
    const asset = { ...block.asset };
    if (asset.storagePath) {
      const fileName = asset.storagePath.split("/").at(-1);
      asset.url = `${ASSET_URL_PREFIX}${fileName}`;
      await ensureBundledAsset(client, asset.storagePath, asset.url);
      delete asset.storagePath;
    }
    result.push({
      ...canonical(block, BLOCK_KEYS),
      asset: canonical(asset, ASSET_KEYS),
    });
  }
  return result;
}

const previousSeed = await readSeedModules();
const previousByTitle = new Map(
  previousSeed.map((lesson) => [lesson.snapshot.title, lesson]),
);
const seedOrder = new Map(
  previousSeed.map((lesson, index) => [lesson.snapshot.title, index]),
);

const client = createServiceClient();
const admin = await resolveAdmin(client);
const templates = (await listAdminModules(client, admin.id)).filter(
  (template) => template.status === "active",
);

templates.sort((left, right) => {
  const leftOrder = seedOrder.get(left.title) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = seedOrder.get(right.title) ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.created_at.localeCompare(right.created_at);
});

const exported = [];
for (const template of templates) {
  const version = await readPublishedVersion(
    client,
    template.current_published_version_id,
  );
  if (!version) {
    process.stdout.write(`  건너뜀(발행 버전 없음): ${template.title}\n`);
    continue;
  }
  const row = comparableRow(version);
  const previous = previousByTitle.get(template.title);
  // 데모 배정이 참조하는 id는 유지한다. 새 모듈만 새 id를 받는다.
  const id = previous?.id || `module-${shortId(template.id)}`;
  const versionId = previous?.versionId || `version-${shortId(template.id)}-1`;
  const entry = {
    id,
    versionId,
    sourceDate:
      previous?.sourceDate ||
      (version.published_at || template.created_at || "").slice(0, 10),
    snapshot: {
      title: row.title,
      summary: row.summary,
      category: row.metadata.category,
      difficulty: row.metadata.difficulty,
      estimatedMinutes: row.metadata.estimatedMinutes,
      tags: row.metadata.tags,
      learningObjectives: row.learningObjectives,
      prerequisites: row.prerequisites,
      submissionRequirements: row.submissionRequirements,
      completionCriteria: row.completionCriteria,
      blocks: await toSeedBlocks(client, row.content.blocks),
    },
  };
  if (previous?.previousTitles) entry.previousTitles = previous.previousTitles;
  exported.push(entry);
}

if (!exported.length) throw new Error("내보낼 발행 모듈이 없습니다.");

await writeFile(SEED_FILE, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
spawnSync(
  "./node_modules/.bin/prettier",
  ["--write", fileURLToPath(SEED_FILE)],
  {
    stdio: "ignore",
  },
);
await writeSeedLock(await readFile(SEED_FILE, "utf8"));

const added = exported.filter(
  (entry) => !previousByTitle.has(entry.snapshot.title),
);
process.stdout.write(
  [
    `데모 시드 재생성 완료: 모듈 ${exported.length}개 (관리자: ${admin.login_id})`,
    added.length
      ? `  새로 들어온 모듈: ${added.map((entry) => entry.snapshot.title).join(", ")}`
      : "  새로 들어온 모듈 없음",
    "",
  ].join("\n"),
);

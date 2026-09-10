// 운영 DB의 발행 모듈과 데모 시드 파일을 대조합니다.
// 원본은 운영 DB이고, 시드 파일은 거기서 뽑아낸 데모용 사본입니다.
import {
  comparableRow,
  comparableVersion,
  createServiceClient,
  listAdminModules,
  readPublishedVersion,
  readSeedModules,
  resolveAdmin,
  stableJson,
} from "./lib/module-sync.mjs";

function assetlessSnapshot(snapshot) {
  // 시드는 번들 자산 URL을, DB는 Storage 경로를 들고 있어 그대로는 비교되지 않는다.
  return {
    ...snapshot,
    content: {
      ...snapshot.content,
      blocks: snapshot.content.blocks.map((block) =>
        block.asset ? { ...block, asset: { name: block.asset.name } } : block,
      ),
    },
  };
}

const seedModules = await readSeedModules();
const client = createServiceClient();
const admin = await resolveAdmin(client);
const templates = await listAdminModules(client, admin.id);

const activeTemplates = templates.filter(
  (template) => template.status === "active",
);
const seedByTitle = new Map(
  seedModules.map((lesson) => [lesson.snapshot.title, lesson]),
);
const dbTitles = new Set(activeTemplates.map((template) => template.title));

const missingInSeed = activeTemplates.filter(
  (template) => !seedByTitle.has(template.title),
);
const missingInDb = seedModules.filter(
  (lesson) => !dbTitles.has(lesson.snapshot.title),
);

const changed = [];
for (const template of activeTemplates) {
  const lesson = seedByTitle.get(template.title);
  if (!lesson) continue;
  const version = await readPublishedVersion(
    client,
    template.current_published_version_id,
  );
  if (!version) {
    changed.push(`${template.title} (운영에 발행 버전이 없음)`);
    continue;
  }
  const dbSnapshot = assetlessSnapshot(comparableRow(version));
  const seedSnapshot = assetlessSnapshot(comparableVersion(lesson.snapshot));
  if (stableJson(dbSnapshot) !== stableJson(seedSnapshot)) {
    changed.push(template.title);
  }
}

const lines = [
  `관리자: ${admin.login_id}`,
  `운영 발행 모듈 ${activeTemplates.length}개 / 데모 시드 ${seedModules.length}개`,
  "",
];

if (missingInSeed.length) {
  lines.push("운영에만 있음 (데모 시드가 낡음):");
  for (const template of missingInSeed) lines.push(`  + ${template.title}`);
  lines.push("");
}
if (missingInDb.length) {
  lines.push("데모 시드에만 있음 (운영에 등록되지 않음):");
  for (const lesson of missingInDb) lines.push(`  - ${lesson.snapshot.title}`);
  lines.push("");
}
if (changed.length) {
  lines.push("내용이 다름:");
  for (const title of changed) lines.push(`  ~ ${title}`);
  lines.push("");
}

const drifted = missingInSeed.length + missingInDb.length + changed.length;
if (!drifted) {
  lines.push("운영 DB와 데모 시드가 일치합니다.");
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

lines.push("해결 방법:");
if (missingInSeed.length || changed.length) {
  lines.push("  데모 시드를 운영 기준으로 다시 뽑기:  npm run seed:export");
}
if (missingInDb.length) {
  lines.push(
    "  운영에 새 강의 등록하기:              npm run module:add -- <모듈파일.json>",
  );
}
lines.push("");
process.stdout.write(`${lines.join("\n")}\n`);
process.exit(1);

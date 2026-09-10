// 운영 DB에 새 강의 하나를 등록합니다.
//
//   npm run module:add -- content/new-modules/데이터-보여주기.json
//
// 같은 제목의 모듈이 이미 있으면 아무것도 하지 않고 멈춥니다.
// 기존 모듈의 초안이나 버전은 어떤 경우에도 건드리지 않습니다.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createServiceClient,
  findTemplateByTitles,
  publishVersion,
  resolveAdmin,
  templatePayload,
  uploadBundledAssets,
} from "./lib/module-sync.mjs";

const REQUIRED_SNAPSHOT_FIELDS = [
  "title",
  "summary",
  "category",
  "difficulty",
  "estimatedMinutes",
  "tags",
  "learningObjectives",
  "prerequisites",
  "submissionRequirements",
  "completionCriteria",
  "blocks",
];

function fail(...lines) {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail(
    "등록할 모듈 파일 경로를 지정하세요: npm run module:add -- <모듈파일.json>",
  );
}

let parsed;
try {
  parsed = JSON.parse(await readFile(resolve(inputPath), "utf8"));
} catch (error) {
  fail(`모듈 파일을 읽지 못했습니다: ${error.message}`);
}
const snapshot = parsed.snapshot ?? parsed;
const missing = REQUIRED_SNAPSHOT_FIELDS.filter(
  (field) => snapshot[field] === undefined,
);
if (missing.length) {
  fail(
    `모듈 파일에 다음 항목이 없습니다: ${missing.join(", ")}`,
    "데모 시드 파일의 모듈 하나를 본보기로 삼으면 형식을 맞추기 쉽습니다.",
  );
}
if (!Array.isArray(snapshot.blocks) || snapshot.blocks.length === 0) {
  fail("학습 내용 블록이 비어 있습니다.");
}

const client = createServiceClient();
const admin = await resolveAdmin(client);

const existing = await findTemplateByTitles(client, admin.id, [snapshot.title]);
if (existing) {
  process.stderr.write(
    [
      `'${snapshot.title}'은 이미 등록돼 있습니다(${existing.id}).`,
      "이 명령은 새 모듈 등록만 합니다. 내용을 고치려면 앱의 모듈 편집기를 쓰세요.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const { data: template, error: insertError } = await client
  .from("gqai_aistudy_module_templates")
  .insert({
    ...templatePayload(snapshot, admin.id),
    status: "draft",
    created_by: admin.id,
  })
  .select("id")
  .single();
if (insertError || !template) {
  throw new Error(`모듈 생성 실패: ${insertError?.message || "결과 없음"}`);
}

const storedSnapshot = await uploadBundledAssets(
  client,
  snapshot,
  template.id,
  admin,
);
if (storedSnapshot !== snapshot) {
  const { error } = await client
    .from("gqai_aistudy_module_templates")
    .update(templatePayload(storedSnapshot, admin.id))
    .eq("id", template.id);
  if (error) throw new Error(`초안 갱신 실패: ${error.message}`);
}

const version = await publishVersion(
  client,
  template.id,
  storedSnapshot,
  admin,
);

process.stdout.write(
  [
    `'${snapshot.title}' 등록·발행 완료 (관리자: ${admin.login_id})`,
    `  모듈 ${template.id}`,
    `  버전 ${version.versionNumber} ${version.id}`,
    "",
    "데모 시드에도 반영하려면: npm run seed:export",
    "",
  ].join("\n"),
);

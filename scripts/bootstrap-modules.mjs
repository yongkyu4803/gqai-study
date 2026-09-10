// 새 운영 환경을 처음 세울 때 한 번만 쓰는 명령입니다.
// 이미 모듈이 있는 DB에서는 --force 없이 중단합니다. 이 명령은 시드에 있는
// 모든 모듈의 초안을 파일 내용으로 덮어쓰기 때문에, 강사가 앱에서 고쳐 둔
// 내용을 지울 수 있습니다.
//
// 운영에 새 강의를 추가할 때는 이 명령이 아니라 `npm run module:add`를 쓰세요.
import {
  comparableRow,
  comparableVersion,
  createServiceClient,
  findTemplateByTitles,
  listAdminModules,
  publishVersion,
  readPublishedVersion,
  readSeedModules,
  resolveAdmin,
  stableJson,
  templatePayload,
  uploadBundledAssets,
} from "./lib/module-sync.mjs";

const force = process.argv.includes("--force");
const modules = await readSeedModules();
const client = createServiceClient();
const admin = await resolveAdmin(client);

const existingModules = await listAdminModules(client, admin.id);
if (existingModules.length && !force) {
  process.stderr.write(
    [
      `'${admin.login_id}' 관리자에게 이미 모듈 ${existingModules.length}개가 있습니다.`,
      "이 명령은 새 운영 환경을 처음 세울 때만 사용합니다.",
      "",
      "  새 강의를 추가하려면:      npm run module:add -- <모듈파일.json>",
      "  데모 시드를 최신화하려면:  npm run seed:export",
      "  차이를 먼저 확인하려면:    npm run check:modules",
      "",
      "그래도 시드 전체를 다시 밀어 넣어야 한다면 --force를 붙이세요.",
      "강사가 앱에서 편집한 초안은 파일 내용으로 덮이고 새 버전이 발행됩니다.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

let created = 0;
let updated = 0;
let unchanged = 0;

for (const lesson of modules) {
  const sourceSnapshot = lesson.snapshot;
  const matchTitles = [sourceSnapshot.title, ...(lesson.previousTitles ?? [])];
  const match = await findTemplateByTitles(client, admin.id, matchTitles);

  let templateId;
  let currentVersionId;
  const isNewTemplate = !match;
  if (isNewTemplate) {
    const { data, error } = await client
      .from("gqai_aistudy_module_templates")
      .insert({
        ...templatePayload(sourceSnapshot, admin.id),
        status: "draft",
        created_by: admin.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(
        `${sourceSnapshot.title} 생성 실패: ${error?.message || "결과 없음"}`,
      );
    }
    templateId = data.id;
    created += 1;
  } else {
    templateId = match.id;
    currentVersionId = match.current_published_version_id;
  }

  const snapshot = await uploadBundledAssets(
    client,
    sourceSnapshot,
    templateId,
    admin,
  );
  const { error: draftError } = await client
    .from("gqai_aistudy_module_templates")
    .update(templatePayload(snapshot, admin.id))
    .eq("id", templateId);
  if (draftError) {
    throw new Error(`${snapshot.title} 초안 갱신 실패: ${draftError.message}`);
  }

  const currentVersion = await readPublishedVersion(client, currentVersionId);
  if (
    currentVersion &&
    stableJson(comparableRow(currentVersion)) ===
      stableJson(comparableVersion(snapshot))
  ) {
    const { error } = await client
      .from("gqai_aistudy_module_templates")
      .update({ status: "active", updated_by: admin.id })
      .eq("id", templateId);
    if (error)
      throw new Error(`${snapshot.title} 상태 갱신 실패: ${error.message}`);
    unchanged += 1;
    continue;
  }

  await publishVersion(client, templateId, snapshot, admin);
  if (!isNewTemplate) updated += 1;
}

process.stdout.write(
  `데모 시드 모듈 등록 완료: 신규 ${created}개, 새 버전 ${updated}개, 변경 없음 ${unchanged}개 (관리자: ${admin.login_id})\n`,
);

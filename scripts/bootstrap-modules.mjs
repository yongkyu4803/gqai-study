import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const requestedAdminLoginId = (process.env.BOOTSTRAP_ADMIN_LOGIN_ID || "")
  .trim()
  .toLowerCase();

if (!url || !serviceRole) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.",
  );
}

const sourceUrl = new URL("../content/notion-modules.json", import.meta.url);
const modules = JSON.parse(await readFile(sourceUrl, "utf8"));
const localAssetPrefix = "/api/module-assets/notion/";

function localAssetFileUrl(assetUrl) {
  if (
    !assetUrl.startsWith(localAssetPrefix) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(
      assetUrl.slice(localAssetPrefix.length),
    )
  ) {
    throw new Error(`허용되지 않은 번들 자산 경로: ${assetUrl}`);
  }
  return new URL(
    `../content/notion-assets/${assetUrl.slice(localAssetPrefix.length)}`,
    import.meta.url,
  );
}

if (!Array.isArray(modules) || modules.length !== 11) {
  throw new Error("노션 강의 모듈 원본은 정확히 11개여야 합니다.");
}

const titles = new Set();
for (const lesson of modules) {
  const snapshot = lesson.snapshot;
  if (!snapshot?.title || titles.has(snapshot.title)) {
    throw new Error(
      `중복되거나 비어 있는 모듈 제목: ${snapshot?.title || "없음"}`,
    );
  }
  titles.add(snapshot.title);
  for (const block of snapshot.blocks || []) {
    const assetUrl = block.asset?.url;
    if (!assetUrl) continue;
    await access(fileURLToPath(localAssetFileUrl(assetUrl)));
  }
}

const client = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let adminQuery = client
  .from("profiles")
  .select("id, login_id, display_name")
  .eq("role", "admin")
  .eq("is_active", true);
if (requestedAdminLoginId) {
  adminQuery = adminQuery.eq("login_id", requestedAdminLoginId);
}
const { data: admins, error: adminError } = await adminQuery;
if (adminError) throw new Error(`관리자 조회 실패: ${adminError.message}`);
if (admins?.length !== 1) {
  throw new Error(
    requestedAdminLoginId
      ? `활성 관리자 '${requestedAdminLoginId}'를 한 명 찾을 수 없습니다.`
      : "활성 관리자가 한 명이 아닙니다. BOOTSTRAP_ADMIN_LOGIN_ID로 대상을 지정하세요.",
  );
}
const admin = admins[0];

async function withPrivateAssets(snapshot, templateId) {
  const blocks = [];
  for (const block of snapshot.blocks) {
    if (!block.asset?.url?.startsWith(localAssetPrefix)) {
      blocks.push(block);
      continue;
    }
    const fileUrl = localAssetFileUrl(block.asset.url);
    const fileName = block.asset.url.slice(localAssetPrefix.length);
    const bytes = await readFile(fileUrl);
    const storagePath = `${templateId}/notion/${fileName}`;
    const { error: uploadError } = await client.storage
      .from("module-assets")
      .upload(storagePath, bytes, {
        contentType: block.asset.mimeType || "image/png",
        cacheControl: "31536000",
        upsert: true,
      });
    if (uploadError) {
      throw new Error(
        `${snapshot.title} 이미지 업로드 실패: ${uploadError.message}`,
      );
    }
    const { error: assetError } = await client.from("module_assets").upsert(
      {
        module_template_id: templateId,
        storage_path: storagePath,
        asset_kind: block.type,
        original_name: block.asset.name,
        mime_type: block.asset.mimeType,
        size_bytes: bytes.byteLength,
        alt_text: block.text || block.asset.name,
        state: "ready",
        uploaded_by: admin.id,
      },
      { onConflict: "storage_path" },
    );
    if (assetError) {
      throw new Error(
        `${snapshot.title} 이미지 메타데이터 저장 실패: ${assetError.message}`,
      );
    }
    blocks.push({
      ...block,
      asset: {
        ...block.asset,
        size: bytes.byteLength,
        url: undefined,
        storagePath,
      },
    });
  }
  return { ...snapshot, blocks };
}

function templatePayload(snapshot) {
  return {
    title: snapshot.title,
    summary: snapshot.summary,
    category: snapshot.category,
    difficulty: snapshot.difficulty,
    estimated_minutes: snapshot.estimatedMinutes,
    tags: snapshot.tags,
    draft_content: { schemaVersion: 1, blocks: snapshot.blocks },
    draft_learning_objectives: snapshot.learningObjectives,
    draft_prerequisites: snapshot.prerequisites,
    draft_submission_requirements: snapshot.submissionRequirements,
    draft_completion_criteria: snapshot.completionCriteria,
    draft_schema_version: 1,
    updated_by: admin.id,
  };
}

function comparableVersion(snapshot) {
  return {
    title: snapshot.title,
    summary: snapshot.summary,
    metadata: {
      category: snapshot.category,
      difficulty: snapshot.difficulty,
      estimatedMinutes: snapshot.estimatedMinutes,
      tags: snapshot.tags,
    },
    content: { schemaVersion: 1, blocks: snapshot.blocks },
    learningObjectives: snapshot.learningObjectives,
    prerequisites: snapshot.prerequisites,
    submissionRequirements: snapshot.submissionRequirements,
    completionCriteria: snapshot.completionCriteria,
  };
}

function comparableRow(row) {
  if (!row) return null;
  return {
    title: row.title_snapshot,
    summary: row.summary_snapshot,
    metadata: row.metadata_snapshot,
    content: row.content_snapshot,
    learningObjectives: row.learning_objectives_snapshot,
    prerequisites: row.prerequisites_snapshot,
    submissionRequirements: row.submission_requirements_snapshot,
    completionCriteria: row.completion_criteria_snapshot,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

let created = 0;
let updated = 0;
let unchanged = 0;

for (const lesson of modules) {
  const sourceSnapshot = lesson.snapshot;
  const { data: matches, error: matchError } = await client
    .from("module_templates")
    .select("id, current_published_version_id")
    .eq("created_by", admin.id)
    .eq("title", sourceSnapshot.title);
  if (matchError)
    throw new Error(`${sourceSnapshot.title} 조회 실패: ${matchError.message}`);
  if ((matches?.length || 0) > 1) {
    throw new Error(
      `${sourceSnapshot.title} 제목의 관리자 모듈이 두 개 이상입니다.`,
    );
  }

  let templateId;
  let currentVersionId;
  const isNewTemplate = !matches?.length;
  if (isNewTemplate) {
    const { data, error } = await client
      .from("module_templates")
      .insert({
        ...templatePayload(sourceSnapshot),
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
    templateId = matches[0].id;
    currentVersionId = matches[0].current_published_version_id;
  }

  const snapshot = await withPrivateAssets(sourceSnapshot, templateId);
  const { error: draftError } = await client
    .from("module_templates")
    .update(templatePayload(snapshot))
    .eq("id", templateId);
  if (draftError) {
    throw new Error(`${snapshot.title} 초안 갱신 실패: ${draftError.message}`);
  }

  let currentVersion = null;
  if (currentVersionId) {
    const { data, error } = await client
      .from("module_versions")
      .select(
        "title_snapshot, summary_snapshot, metadata_snapshot, content_snapshot, learning_objectives_snapshot, prerequisites_snapshot, submission_requirements_snapshot, completion_criteria_snapshot",
      )
      .eq("id", currentVersionId)
      .maybeSingle();
    if (error)
      throw new Error(
        `${snapshot.title} 현재 버전 조회 실패: ${error.message}`,
      );
    currentVersion = data;
  }

  if (
    currentVersion &&
    stableJson(comparableRow(currentVersion)) ===
      stableJson(comparableVersion(snapshot))
  ) {
    const { error } = await client
      .from("module_templates")
      .update({ status: "active", updated_by: admin.id })
      .eq("id", templateId);
    if (error)
      throw new Error(`${snapshot.title} 상태 갱신 실패: ${error.message}`);
    unchanged += 1;
    continue;
  }

  const { data: latestVersions, error: latestError } = await client
    .from("module_versions")
    .select("version_number")
    .eq("module_template_id", templateId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (latestError) {
    throw new Error(
      `${snapshot.title} 버전 번호 조회 실패: ${latestError.message}`,
    );
  }
  const versionNumber = (latestVersions?.[0]?.version_number || 0) + 1;
  const versionPayload = comparableVersion(snapshot);
  const checksum = createHash("sha256")
    .update(stableJson(versionPayload))
    .digest("hex");
  const { data: version, error: versionError } = await client
    .from("module_versions")
    .insert({
      module_template_id: templateId,
      version_number: versionNumber,
      title_snapshot: versionPayload.title,
      summary_snapshot: versionPayload.summary,
      metadata_snapshot: versionPayload.metadata,
      content_snapshot: versionPayload.content,
      learning_objectives_snapshot: versionPayload.learningObjectives,
      prerequisites_snapshot: versionPayload.prerequisites,
      submission_requirements_snapshot: versionPayload.submissionRequirements,
      completion_criteria_snapshot: versionPayload.completionCriteria,
      schema_version: 1,
      content_checksum: checksum,
      published_by: admin.id,
    })
    .select("id")
    .single();
  if (versionError || !version) {
    throw new Error(
      `${snapshot.title} 버전 발행 실패: ${versionError?.message || "결과 없음"}`,
    );
  }
  const { error: activateError } = await client
    .from("module_templates")
    .update({
      status: "active",
      current_published_version_id: version.id,
      updated_by: admin.id,
    })
    .eq("id", templateId);
  if (activateError) {
    throw new Error(
      `${snapshot.title} 발행 연결 실패: ${activateError.message}`,
    );
  }
  if (!isNewTemplate) updated += 1;
}

process.stdout.write(
  `노션 강의 모듈 동기화 완료: 신규 ${created}개, 새 버전 ${updated}개, 변경 없음 ${unchanged}개 (관리자: ${admin.login_id})\n`,
);

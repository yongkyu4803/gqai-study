import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const SEED_FILE = new URL(
  "../../content/demo-seed-modules.generated.json",
  import.meta.url,
);
export const SEED_LOCK_FILE = new URL(
  "../../content/demo-seed-modules.lock",
  import.meta.url,
);
export const ASSET_URL_PREFIX = "/api/module-assets/notion/";
export const ASSET_BUCKET = "gqai-aistudy-module-assets";

export function bundledAssetFileUrl(assetUrl) {
  const fileName = assetUrl.startsWith(ASSET_URL_PREFIX)
    ? assetUrl.slice(ASSET_URL_PREFIX.length)
    : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileName)) {
    throw new Error(`허용되지 않은 번들 자산 경로: ${assetUrl}`);
  }
  return new URL(`../../content/notion-assets/${fileName}`, import.meta.url);
}

export async function readSeedModules() {
  const modules = JSON.parse(await readFile(SEED_FILE, "utf8"));
  if (!Array.isArray(modules) || modules.length < 1) {
    throw new Error("데모 시드가 비어 있습니다.");
  }
  const titles = new Set();
  for (const lesson of modules) {
    const title = lesson.snapshot?.title;
    if (!title || titles.has(title)) {
      throw new Error(`중복되거나 비어 있는 모듈 제목: ${title || "없음"}`);
    }
    titles.add(title);
    for (const block of lesson.snapshot.blocks || []) {
      if (block.asset?.url) {
        await access(fileURLToPath(bundledAssetFileUrl(block.asset.url)));
      }
    }
  }
  return modules;
}

export function seedChecksum(text) {
  return createHash("sha256").update(text).digest("hex");
}

export async function readSeedLock() {
  try {
    return (await readFile(SEED_LOCK_FILE, "utf8")).trim();
  } catch {
    return "";
  }
}

export async function writeSeedLock(text) {
  await writeFile(SEED_LOCK_FILE, `${seedChecksum(text)}\n`, "utf8");
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.",
    );
  }
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function resolveAdmin(client) {
  const requested = (process.env.BOOTSTRAP_ADMIN_LOGIN_ID || "")
    .trim()
    .toLowerCase();
  let query = client
    .from("gqai_aistudy_profiles")
    .select("id, login_id, display_name")
    .eq("role", "admin")
    .eq("is_active", true);
  if (requested) query = query.eq("login_id", requested);
  const { data, error } = await query;
  if (error) throw new Error(`관리자 조회 실패: ${error.message}`);
  if (data?.length !== 1) {
    throw new Error(
      requested
        ? `활성 관리자 '${requested}'를 한 명 찾을 수 없습니다.`
        : "활성 관리자가 한 명이 아닙니다. BOOTSTRAP_ADMIN_LOGIN_ID로 대상을 지정하세요.",
    );
  }
  return data[0];
}

export async function listAdminModules(client, adminId) {
  const { data, error } = await client
    .from("gqai_aistudy_module_templates")
    .select("id, title, status, current_published_version_id, created_at")
    .eq("created_by", adminId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`모듈 조회 실패: ${error.message}`);
  return data || [];
}

export async function findTemplateByTitles(client, adminId, titles) {
  const { data, error } = await client
    .from("gqai_aistudy_module_templates")
    .select("id, title, current_published_version_id")
    .eq("created_by", adminId)
    .in("title", titles);
  if (error) throw new Error(`${titles[0]} 조회 실패: ${error.message}`);
  if ((data?.length || 0) > 1) {
    throw new Error(`${titles[0]} 제목의 관리자 모듈이 두 개 이상입니다.`);
  }
  return data?.[0] || null;
}

export async function uploadBundledAssets(client, snapshot, templateId, admin) {
  const blocks = [];
  for (const block of snapshot.blocks) {
    if (!block.asset?.url?.startsWith(ASSET_URL_PREFIX)) {
      blocks.push(block);
      continue;
    }
    const fileName = block.asset.url.slice(ASSET_URL_PREFIX.length);
    const bytes = await readFile(bundledAssetFileUrl(block.asset.url));
    const storagePath = `${templateId}/notion/${fileName}`;
    const { error: uploadError } = await client.storage
      .from(ASSET_BUCKET)
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
    const { error: assetError } = await client
      .from("gqai_aistudy_module_assets")
      .upsert(
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
    const privateAsset = {
      ...block.asset,
      size: bytes.byteLength,
      storagePath,
    };
    delete privateAsset.url;
    blocks.push({ ...block, asset: privateAsset });
  }
  return { ...snapshot, blocks };
}

export function templatePayload(snapshot, adminId) {
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
    updated_by: adminId,
  };
}

export function comparableVersion(snapshot) {
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

export const VERSION_SNAPSHOT_COLUMNS =
  "published_at, title_snapshot, summary_snapshot, metadata_snapshot, content_snapshot, learning_objectives_snapshot, prerequisites_snapshot, submission_requirements_snapshot, completion_criteria_snapshot";

export function comparableRow(row) {
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

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function readPublishedVersion(client, versionId) {
  if (!versionId) return null;
  const { data, error } = await client
    .from("gqai_aistudy_module_versions")
    .select(VERSION_SNAPSHOT_COLUMNS)
    .eq("id", versionId)
    .maybeSingle();
  if (error) throw new Error(`현재 버전 조회 실패: ${error.message}`);
  return data;
}

export async function publishVersion(client, templateId, snapshot, admin) {
  const { data: latestVersions, error: latestError } = await client
    .from("gqai_aistudy_module_versions")
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
  const payload = comparableVersion(snapshot);
  const { data: version, error: versionError } = await client
    .from("gqai_aistudy_module_versions")
    .insert({
      module_template_id: templateId,
      version_number: versionNumber,
      title_snapshot: payload.title,
      summary_snapshot: payload.summary,
      metadata_snapshot: payload.metadata,
      content_snapshot: payload.content,
      learning_objectives_snapshot: payload.learningObjectives,
      prerequisites_snapshot: payload.prerequisites,
      submission_requirements_snapshot: payload.submissionRequirements,
      completion_criteria_snapshot: payload.completionCriteria,
      schema_version: 1,
      content_checksum: createHash("sha256")
        .update(stableJson(payload))
        .digest("hex"),
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
    .from("gqai_aistudy_module_templates")
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
  return { id: version.id, versionNumber };
}

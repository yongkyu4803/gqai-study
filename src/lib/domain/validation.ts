import { z } from "zod";
import type { ModuleSnapshot, SubmissionItem } from "./types";

export const loginIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, "아이디는 4자 이상 입력하세요.")
  .max(32, "아이디는 32자 이하로 입력하세요.")
  .regex(
    /^[a-z0-9][a-z0-9._-]+$/,
    "영문 소문자, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.",
  );

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상 입력하세요.")
  .max(72, "비밀번호는 72자 이하로 입력하세요.")
  .regex(/[A-Za-z]/, "영문자를 한 글자 이상 포함하세요.")
  .regex(/[0-9]/, "숫자를 한 글자 이상 포함하세요.");

export const studentSchema = z.object({
  displayName: z.string().trim().min(1, "학생 이름을 입력하세요.").max(50),
  loginId: loginIdSchema,
  password: passwordSchema,
  groupIds: z.array(z.string()),
});

export const accountRequestSchema = z.object({
  displayName: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  contact: z.string().trim().min(1, "연락처를 입력하세요.").max(100),
  note: z.string().trim().max(300).optional(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "그룹 이름을 입력하세요.").max(80),
  description: z.string().trim().max(300),
  memberIds: z.array(z.string()),
});

export const moduleMetaSchema = z.object({
  title: z.string().trim().min(1, "모듈 제목을 입력하세요.").max(150),
  summary: z.string().trim().max(300),
  category: z.string().trim().max(80),
  estimatedMinutes: z.number().int().min(1).max(1440),
});

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .url("올바른 웹 주소를 입력하세요.")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "http 또는 https 주소만 사용할 수 있습니다.",
  });

const moduleSnapshotSchema = moduleMetaSchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  tags: z.array(z.string().trim().min(1).max(50)).max(30),
  learningObjectives: z.array(z.string().trim().min(1).max(500)).max(50),
  prerequisites: z.array(z.string().trim().min(1).max(500)).max(50),
  submissionRequirements: z.array(z.string().trim().min(1).max(500)).max(50),
  completionCriteria: z.array(z.string().trim().min(1).max(500)).max(50),
  blocks: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum([
          "paragraph",
          "heading",
          "bullet_list",
          "numbered_list",
          "checklist",
          "quote",
          "divider",
          "code",
          "link",
          "image",
          "pdf",
          "attachment",
        ]),
        text: z.string().max(50_000).optional(),
        url: z.string().max(2_000).optional(),
      }),
    )
    .max(200),
});

function firstIssue(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? null : result.error.issues[0]?.message;
}

export function isSafeHttpUrl(value?: string): boolean {
  return safeHttpUrlSchema.safeParse(value).success;
}

export function isBundledModuleAssetUrl(value?: string): value is string {
  return Boolean(
    value &&
    /^\/api\/module-assets\/notion\/[a-z0-9][a-z0-9._-]*$/i.test(value) &&
    !value.includes(".."),
  );
}

export function isSafeAssetUrl(value?: string): value is string {
  return Boolean(
    value &&
    (isSafeHttpUrl(value) ||
      value.startsWith("blob:") ||
      isBundledModuleAssetUrl(value)),
  );
}

export function validateModuleSnapshot(
  snapshot: ModuleSnapshot,
  options: { forPublish?: boolean } = {},
) {
  const issue = firstIssue(moduleSnapshotSchema.safeParse(snapshot));
  if (issue) throw new Error(issue);
  if (
    options.forPublish &&
    !snapshot.blocks.some(
      (block) => block.text?.trim() || block.url?.trim() || block.asset,
    )
  ) {
    throw new Error("학습 내용을 한 개 이상 추가하세요.");
  }
  for (const block of snapshot.blocks) {
    if (block.type === "link") {
      if (!block.url?.trim() && options.forPublish) {
        throw new Error("링크 블록의 웹 주소를 입력하세요.");
      }
      if (block.url?.trim() && !isSafeHttpUrl(block.url)) {
        throw new Error(
          "링크 블록에는 http 또는 https 주소만 사용할 수 있습니다.",
        );
      }
    }
    if (
      options.forPublish &&
      ["image", "pdf", "attachment"].includes(block.type) &&
      !block.asset
    ) {
      throw new Error("첨부 블록에 파일을 추가하세요.");
    }
  }
}

export function validateSubmissionItems(items: SubmissionItem[]) {
  if (!items.length) throw new Error("제출 항목을 한 개 이상 추가하세요.");
  if (items.length > 100)
    throw new Error("제출 항목은 100개 이하만 가능합니다.");
  for (const item of items) {
    if (item.type === "text" && !item.text?.trim()) {
      throw new Error("텍스트 제출 항목의 내용을 입력하세요.");
    }
    if (item.type === "text" && (item.text?.length ?? 0) > 100_000) {
      throw new Error("텍스트 제출 항목이 너무 깁니다.");
    }
    if (item.type === "link" && !isSafeHttpUrl(item.url)) {
      throw new Error(
        "제출 링크에는 http 또는 https 주소만 사용할 수 있습니다.",
      );
    }
    if (["image", "file"].includes(item.type)) {
      if (!item.asset?.name || (!item.asset.storagePath && !item.asset.url)) {
        throw new Error("이미지 또는 파일 제출 항목에 파일을 추가하세요.");
      }
      if (item.asset.size < 1 || item.asset.size > MAX_FILE_BYTES) {
        throw new Error("제출 파일은 50MB 이하만 사용할 수 있습니다.");
      }
    }
  }
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const blockedExtensions = [
  ".exe",
  ".msi",
  ".dmg",
  ".pkg",
  ".app",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
];

export function validateFile(file: Pick<File, "name" | "size">) {
  if (file.size > MAX_FILE_BYTES) {
    return "파일은 50MB 이하만 업로드할 수 있습니다.";
  }
  const lower = file.name.toLowerCase();
  if (blockedExtensions.some((extension) => lower.endsWith(extension))) {
    return "안전을 위해 실행 파일은 업로드할 수 없습니다.";
  }
  return null;
}

export function toAuthEmail(loginId: string) {
  const normalized = loginIdSchema.parse(loginId);
  return `${normalized}@accounts.gqai.local`;
}

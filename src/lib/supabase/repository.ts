import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppState,
  AssignmentInput,
  AssignmentManagementAction,
  ContentBlock,
  FeedbackInput,
  FileAsset,
  ModuleSnapshot,
  SubmissionDraftInput,
} from "@/lib/domain/types";
import { isBundledModuleAssetUrl } from "@/lib/domain/validation";

// Supabase is intentionally schema-agnostic until the user links their project.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const emptyState: AppState = {
  profiles: [],
  groups: [],
  modules: [],
  versions: [],
  batches: [],
  assignments: [],
  submissions: [],
  feedback: [],
  activities: [],
  featureFlags: [],
};

// Renew private asset links before they expire so an already-open lesson does
// not degrade into broken images during a long study session.
export const SIGNED_ASSET_URL_TTL_SECONDS = 60 * 60;
export const SIGNED_ASSET_URL_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

function snapshotFromTemplate(row: Row): ModuleSnapshot {
  return {
    title: row.title ?? "제목 없음",
    summary: row.summary ?? "",
    category: row.category ?? "미분류",
    difficulty: row.difficulty ?? "beginner",
    estimatedMinutes: row.estimated_minutes ?? 30,
    tags: row.tags ?? [],
    learningObjectives: row.draft_learning_objectives ?? [],
    prerequisites: row.draft_prerequisites ?? [],
    submissionRequirements: row.draft_submission_requirements ?? [],
    completionCriteria: row.draft_completion_criteria ?? [],
    blocks: stripStoredAssetUrls(
      (row.draft_content?.blocks ?? row.draft_content ?? []) as ContentBlock[],
    ),
  };
}

function snapshotFromVersion(row: Row): ModuleSnapshot {
  const metadata = row.metadata_snapshot ?? {};
  return {
    title: row.title_snapshot ?? "제목 없음",
    summary: row.summary_snapshot ?? "",
    category: metadata.category ?? "미분류",
    difficulty: metadata.difficulty ?? "beginner",
    estimatedMinutes: metadata.estimatedMinutes ?? 30,
    tags: metadata.tags ?? [],
    learningObjectives: row.learning_objectives_snapshot ?? [],
    prerequisites: row.prerequisites_snapshot ?? [],
    submissionRequirements: row.submission_requirements_snapshot ?? [],
    completionCriteria: row.completion_criteria_snapshot ?? [],
    blocks: stripStoredAssetUrls(
      (row.content_snapshot?.blocks ??
        row.content_snapshot ??
        []) as ContentBlock[],
    ),
  };
}

function stripStoredAssetUrls(blocks: ContentBlock[]) {
  return blocks.map((block) =>
    block.asset
      ? {
          ...block,
          asset: {
            ...block.asset,
            url: isBundledModuleAssetUrl(block.asset.url)
              ? block.asset.url
              : undefined,
          },
        }
      : block,
  );
}

function assertOk(error: { message: string } | null | undefined) {
  if (error) throw new Error(error.message);
}

export class SupabaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async loadState(): Promise<AppState> {
    const [
      profiles,
      groups,
      memberships,
      modules,
      versions,
      batches,
      assignments,
      studentNotes,
      submissions,
      submissionItems,
      feedback,
      feedbackAttachments,
      activities,
      flags,
    ] = await Promise.all([
      this.client.from("gqai_aistudy_profiles").select("*").order("display_name"),
      this.client.from("gqai_aistudy_groups").select("*").order("name"),
      this.client.from("gqai_aistudy_group_members").select("*"),
      this.client
        .from("gqai_aistudy_module_templates")
        .select("*")
        .order("updated_at", { ascending: false }),
      this.client.from("gqai_aistudy_module_versions").select("*").order("version_number"),
      this.client
        .from("gqai_aistudy_assignment_batches")
        .select("*")
        .order("assigned_at", { ascending: false }),
      this.client
        .from("gqai_aistudy_learner_assignments")
        .select("*")
        .order("created_at", { ascending: false }),
      this.client.from("gqai_aistudy_student_notes").select("learner_assignment_id, note"),
      this.client.from("gqai_aistudy_submissions").select("*").order("created_at"),
      this.client.from("gqai_aistudy_submission_items").select("*").order("sort_order"),
      this.client.from("gqai_aistudy_feedback_messages").select("*").order("created_at"),
      this.client.from("gqai_aistudy_feedback_attachments").select("*"),
      this.client
        .from("gqai_aistudy_activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      this.client.from("gqai_aistudy_feature_flags").select("*"),
    ]);

    const firstError = [
      profiles.error,
      groups.error,
      memberships.error,
      modules.error,
      versions.error,
      batches.error,
      assignments.error,
      studentNotes.error,
      submissions.error,
      submissionItems.error,
      feedback.error,
      feedbackAttachments.error,
      activities.error,
      flags.error,
    ].find(Boolean);
    assertOk(firstError);

    const state: AppState = {
      profiles: (profiles.data ?? []).map((row: Row) => ({
        id: row.id,
        role: row.role,
        loginId: row.login_id,
        displayName: row.display_name,
        email: row.email ?? undefined,
        mustChangePassword: row.must_change_password,
        isActive: row.is_active,
        lastLoginAt: row.last_login_at ?? undefined,
        createdAt: row.created_at,
      })),
      groups: (groups.data ?? []).map((row: Row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        memberIds: (memberships.data ?? [])
          .filter((membership: Row) => membership.group_id === row.id)
          .map((membership: Row) => membership.student_id),
        isArchived: row.is_archived,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      modules: (modules.data ?? []).map((row: Row) => ({
        id: row.id,
        status: row.status,
        draft: snapshotFromTemplate(row),
        currentVersionId: row.current_published_version_id ?? undefined,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archivedAt: row.archived_at ?? undefined,
      })),
      versions: (versions.data ?? []).map((row: Row) => ({
        id: row.id,
        moduleTemplateId: row.module_template_id,
        versionNumber: row.version_number,
        snapshot: snapshotFromVersion(row),
        checksum: row.content_checksum,
        publishedBy: row.published_by,
        publishedAt: row.published_at,
      })),
      batches: (batches.data ?? []).map((row: Row) => ({
        sortOrder: row.sort_order ?? undefined,
        id: row.id,
        moduleVersionId: row.module_version_id,
        targetKind: row.target_kind,
        sourceGroupId: row.source_group_id ?? undefined,
        commonInstruction: row.common_instruction ?? "",
        targetSnapshot: row.target_snapshot ?? [],
        recipientCount: row.recipient_count,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
      })),
      assignments: (assignments.data ?? []).map((row: Row) => ({
        sortOrder: row.sort_order ?? undefined,
        id: row.id,
        assignmentBatchId: row.assignment_batch_id,
        moduleVersionId: row.module_version_id,
        studentId: row.student_id,
        sourceGroupId: row.source_group_id ?? undefined,
        personalInstruction: row.personal_instruction ?? "",
        learningStatus: row.learning_status,
        assignmentStatus: row.assignment_status,
        studentNote:
          (studentNotes.data ?? []).find(
            (note: Row) => note.learner_assignment_id === row.id,
          )?.note ?? "",
        firstOpenedAt: row.first_opened_at ?? undefined,
        startedAt: row.started_at ?? undefined,
        courseCompletedAt: row.course_completed_at ?? undefined,
        lastActivityAt: row.last_activity_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      submissions: (submissions.data ?? []).map((row: Row) => ({
        id: row.id,
        assignmentId: row.learner_assignment_id,
        studentId: row.student_id,
        revisionNumber: row.revision_number ?? undefined,
        status: row.status,
        basedOnSubmissionId: row.based_on_submission_id ?? undefined,
        items: (submissionItems.data ?? [])
          .filter((item: Row) => item.submission_id === row.id)
          .map((item: Row) => ({
            id: item.id,
            type: item.item_type,
            order: item.sort_order,
            text: item.text_content ?? undefined,
            url: item.url ?? undefined,
            asset: item.storage_path
              ? {
                  id: item.id,
                  name: item.original_name,
                  size: item.size_bytes,
                  mimeType: item.mime_type,
                  storagePath: item.storage_path,
                }
              : undefined,
          })),
        submittedAt: row.submitted_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      feedback: (feedback.data ?? []).map((row: Row) => ({
        id: row.id,
        assignmentId: row.learner_assignment_id,
        submissionId: row.submission_id ?? undefined,
        authorId: row.author_id,
        kind: row.kind,
        body: row.body ?? "",
        attachments: (feedbackAttachments.data ?? [])
          .filter((item: Row) => item.feedback_message_id === row.id)
          .map((item: Row) => ({
            id: item.id,
            name: item.original_name,
            size: item.size_bytes,
            mimeType: item.mime_type,
            storagePath: item.storage_path,
          })),
        readByStudentAt: row.read_by_student_at ?? undefined,
        createdAt: row.created_at,
      })),
      activities: (activities.data ?? []).map((row: Row) => ({
        id: row.id,
        eventName: row.event_name,
        actorId: row.actor_id ?? undefined,
        studentId: row.student_id ?? undefined,
        assignmentId: row.learner_assignment_id ?? undefined,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
      })),
      featureFlags: (flags.data ?? []).map((row: Row) => ({
        key: row.key,
        enabled: row.enabled,
        visibility: row.visibility,
        description: row.description,
      })),
    };
    const assets: Array<{
      bucket: "gqai-aistudy-module-assets" | "gqai-aistudy-submission-assets" | "gqai-aistudy-feedback-assets";
      asset: FileAsset;
    }> = [];
    for (const template of state.modules) {
      for (const block of template.draft.blocks) {
        if (block.asset?.storagePath)
          assets.push({ bucket: "gqai-aistudy-module-assets", asset: block.asset });
      }
    }
    for (const version of state.versions) {
      for (const block of version.snapshot.blocks) {
        if (block.asset?.storagePath)
          assets.push({ bucket: "gqai-aistudy-module-assets", asset: block.asset });
      }
    }
    for (const submission of state.submissions) {
      for (const item of submission.items) {
        if (item.asset?.storagePath)
          assets.push({ bucket: "gqai-aistudy-submission-assets", asset: item.asset });
      }
    }
    for (const message of state.feedback) {
      for (const asset of message.attachments) {
        if (asset.storagePath)
          assets.push({ bucket: "gqai-aistudy-feedback-assets", asset });
      }
    }

    const uniqueAssets = new Map<
      string,
      {
        bucket: (typeof assets)[number]["bucket"];
        storagePath: string;
        assets: FileAsset[];
      }
    >();
    for (const { bucket, asset } of assets) {
      const storagePath = asset.storagePath!;
      const key = `${bucket}:${storagePath}`;
      const existing = uniqueAssets.get(key);
      if (existing) {
        existing.assets.push(asset);
      } else {
        uniqueAssets.set(key, { bucket, storagePath, assets: [asset] });
      }
    }
    await Promise.all(
      Array.from(uniqueAssets.values()).map(
        async ({ bucket, storagePath, assets: matchingAssets }) => {
          try {
            const url = await this.getSignedUrl(bucket, storagePath);
            matchingAssets.forEach((asset) => {
              asset.url = url;
            });
          } catch {
            // The UI still shows metadata when a missing file or RLS blocks access.
          }
        },
      ),
    );
    return state;
  }

  async createGroup(input: {
    name: string;
    description: string;
    memberIds: string[];
  }) {
    const { data, error } = await this.client
      .from("gqai_aistudy_groups")
      .insert({ name: input.name, description: input.description })
      .select("id")
      .single();
    assertOk(error);
    if (!data) throw new Error("그룹 생성 결과가 없습니다.");
    if (input.memberIds.length) {
      const { error: memberError } = await this.client
        .from("gqai_aistudy_group_members")
        .insert(
          input.memberIds.map((studentId) => ({
            group_id: data.id,
            student_id: studentId,
          })),
        );
      assertOk(memberError);
    }
    return data.id as string;
  }

  async updateGroup(
    id: string,
    input: { name: string; description: string; memberIds: string[] },
  ) {
    const { error } = await this.client
      .from("gqai_aistudy_groups")
      .update({ name: input.name, description: input.description })
      .eq("id", id);
    assertOk(error);
    const { error: deleteError } = await this.client
      .from("gqai_aistudy_group_members")
      .delete()
      .eq("group_id", id);
    assertOk(deleteError);
    if (input.memberIds.length) {
      const { error: insertError } = await this.client
        .from("gqai_aistudy_group_members")
        .insert(
          input.memberIds.map((studentId) => ({
            group_id: id,
            student_id: studentId,
          })),
        );
      assertOk(insertError);
    }
  }

  async archiveGroup(id: string, archived: boolean) {
    const { error } = await this.client
      .from("gqai_aistudy_groups")
      .update({ is_archived: archived })
      .eq("id", id);
    assertOk(error);
  }

  async createDraftModule(snapshot: ModuleSnapshot) {
    const { data, error } = await this.client
      .from("gqai_aistudy_module_templates")
      .insert({
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
      })
      .select("id")
      .single();
    assertOk(error);
    if (!data) throw new Error("모듈 생성 결과가 없습니다.");
    return data.id as string;
  }

  async saveModule(id: string, snapshot: ModuleSnapshot) {
    const { error } = await this.client
      .from("gqai_aistudy_module_templates")
      .update({
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
      })
      .eq("id", id);
    assertOk(error);
  }

  async publishModule(id: string) {
    const { data, error } = await this.client.rpc("gqai_aistudy_publish_module_version", {
      p_module_id: id,
    });
    assertOk(error);
    return data as string;
  }

  async archiveModule(id: string, archived: boolean) {
    const { error } = await this.client
      .from("gqai_aistudy_module_templates")
      .update({
        status: archived ? "archived" : "draft",
        archived_at: archived ? new Date().toISOString() : null,
      })
      .eq("id", id);
    assertOk(error);
  }

  async assign(input: AssignmentInput, idempotencyKey = crypto.randomUUID()) {
    const { data, error } = await this.client.rpc("gqai_aistudy_assign_module", {
      p_module_version_id: input.moduleVersionId,
      p_target_kind: input.targetKind,
      p_student_ids: input.studentIds,
      p_group_id: input.groupId ?? null,
      p_common_instruction: input.commonInstruction,
      p_idempotency_key: idempotencyKey,
    });
    assertOk(error);
    return data as string;
  }

  async reorderAssignments(kind: "student" | "group", targetId: string, ids: string[]) {
    const { error } = await this.client.rpc("gqai_aistudy_reorder_assignments", {
      p_kind: kind,
      p_target_id: targetId,
      p_ids: ids,
    });
    assertOk(error);
  }

  async manageAssignment(
    assignmentId: string,
    action: AssignmentManagementAction,
    instruction = "",
  ) {
    const { error } = await this.client.rpc("gqai_aistudy_manage_assignment", {
      p_assignment_id: assignmentId,
      p_action: action,
      p_instruction: instruction,
    });
    assertOk(error);
  }

  async updateLearning(
    assignmentId: string,
    action: "open" | "start" | "toggle_complete" | "note",
    note?: string,
  ) {
    const { error } = await this.client.rpc("gqai_aistudy_update_learning_state", {
      p_assignment_id: assignmentId,
      p_action: action,
      p_note: note ?? null,
    });
    assertOk(error);
  }

  async saveDraft(input: SubmissionDraftInput) {
    const { data, error } = await this.client.rpc("gqai_aistudy_save_submission_draft", {
      p_assignment_id: input.assignmentId,
      p_items: input.items,
      p_based_on_submission_id: input.basedOnSubmissionId ?? null,
    });
    assertOk(error);
    return data as string;
  }

  async submit(assignmentId: string) {
    const { data, error } = await this.client.rpc("gqai_aistudy_submit_assignment", {
      p_assignment_id: assignmentId,
    });
    assertOk(error);
    return data as string;
  }

  async createFeedback(input: FeedbackInput) {
    const { data, error } = await this.client.rpc("gqai_aistudy_create_feedback_message", {
      p_assignment_id: input.assignmentId,
      p_submission_id: input.submissionId ?? null,
      p_kind: input.kind,
      p_body: input.body,
      p_attachments: input.attachments,
    });
    assertOk(error);
    return data as string;
  }

  async markFeedbackRead(assignmentId: string) {
    const { error } = await this.client.rpc("gqai_aistudy_mark_feedback_read", {
      p_assignment_id: assignmentId,
    });
    assertOk(error);
  }

  async upload(
    bucket: "gqai-aistudy-module-assets" | "gqai-aistudy-submission-assets" | "gqai-aistudy-feedback-assets",
    path: string,
    file: File,
  ): Promise<FileAsset> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { upsert: false });
    assertOk(error);
    const asset: FileAsset = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      storagePath: path,
    };

    if (bucket === "gqai-aistudy-module-assets") {
      const moduleId = path.split("/")[0];
      const assetKind = file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf"
          ? "pdf"
          : "attachment";
      const { error: metadataError } = await this.client
        .from("gqai_aistudy_module_assets")
        .insert({
          module_template_id: moduleId,
          storage_path: path,
          asset_kind: assetKind,
          original_name: file.name,
          mime_type: asset.mimeType,
          size_bytes: file.size,
        });
      if (metadataError) {
        await this.client.storage.from(bucket).remove([path]);
        assertOk(metadataError);
      }
    }

    return asset;
  }

  async getSignedUrl(
    bucket: "gqai-aistudy-module-assets" | "gqai-aistudy-submission-assets" | "gqai-aistudy-feedback-assets",
    path: string,
  ) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_ASSET_URL_TTL_SECONDS);
    assertOk(error);
    if (!data) throw new Error("서명 URL을 만들지 못했습니다.");
    return data.signedUrl;
  }
}

export function getEmptyState() {
  return structuredClone(emptyState);
}

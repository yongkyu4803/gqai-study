"use client";
/* eslint-disable @next/next/no-assign-module-variable -- domain term, not the Node.js module object */
/* eslint-disable @next/next/no-img-element -- module images use dynamic private signed/blob URLs */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Code2,
  Copy,
  Eye,
  FileText,
  FilePlus2,
  Heading2,
  ImageIcon,
  Link2,
  List,
  ListChecks,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import {
  EmptyState,
  InlineMessage,
  PageHeader,
  StatusBadge,
} from "@/components/common/page-parts";
import { ModuleReader } from "@/components/modules/module-reader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  compareAdminModules,
  formatAdminModuleSequence,
  getAdminModuleSequence,
} from "@/lib/admin/module-order";
import { formatDate } from "@/lib/domain/status";
import { newContentBlock } from "@/lib/domain/operations";
import { getLearningPaths } from "@/lib/domain/learning-paths";
import type {
  BlockType,
  ContentBlock,
  Difficulty,
  ModuleSnapshot,
} from "@/lib/domain/types";
import {
  isSafeAssetUrl,
  isSafeHttpUrl,
  validateModuleSnapshot,
} from "@/lib/domain/validation";

const blockLabels: Record<BlockType, string> = {
  paragraph: "문단",
  heading: "제목",
  bullet_list: "글머리 목록",
  numbered_list: "번호 목록",
  checklist: "체크리스트",
  quote: "인용문",
  divider: "구분선",
  code: "코드",
  link: "링크",
  image: "이미지",
  pdf: "PDF",
  attachment: "첨부파일",
};

const quickBlockTypes = [
  { type: "paragraph", label: "본문", icon: FileText },
  { type: "heading", label: "소제목", icon: Heading2 },
  { type: "bullet_list", label: "목록", icon: List },
  { type: "checklist", label: "체크", icon: ListChecks },
  { type: "link", label: "링크", icon: Link2 },
  { type: "image", label: "이미지", icon: ImageIcon },
] satisfies Array<{
  type: BlockType;
  label: string;
  icon: typeof FileText;
}>;

const attachmentBlockTypes = new Set<BlockType>(["image", "pdf", "attachment"]);

function blockPlaceholder(type: BlockType) {
  if (type === "heading") return "예: 이번 실습에서 할 일";
  if (type === "quote") return "강조할 문장이나 안내를 입력하세요.";
  if (type === "code") return "실습에 사용할 코드를 입력하세요.";
  if (type === "link") return "링크 이름이나 참고 설명을 입력하세요.";
  if (type === "checklist") return "학생이 확인할 항목을 입력하세요.";
  if (type === "bullet_list" || type === "numbered_list")
    return "목록 항목을 입력하세요.";
  if (attachmentBlockTypes.has(type))
    return type === "image"
      ? "이미지 설명과 대체 텍스트를 입력하세요."
      : "자료에 대한 설명을 입력하세요.";
  return "학습 내용을 입력하세요.";
}

export function ModulesListView() {
  const router = useRouter();
  const { state, createModule, duplicateModule, archiveModule } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [pendingModuleId, setPendingModuleId] = useState("");
  const [actionError, setActionError] = useState("");
  const categories = useMemo(
    () => [...new Set(state.modules.map((item) => item.draft.category))].sort(),
    [state.modules],
  );
  const modules = useMemo(
    () =>
      state.modules
        .filter(
          (item) =>
            `${item.draft.title} ${item.draft.category} ${item.draft.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (status === "all" || item.status === status) &&
            (category === "all" || item.draft.category === category) &&
            (difficulty === "all" || item.draft.difficulty === difficulty),
        )
        .sort(compareAdminModules),
    [category, difficulty, query, state.modules, status],
  );
  async function create() {
    setPendingModuleId("create");
    setActionError("");
    try {
      const id = await createModule();
      router.push(`/admin/modules/${id}/edit`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "모듈을 만들지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPendingModuleId("");
    }
  }
  async function duplicate(moduleId: string) {
    setPendingModuleId(moduleId);
    setActionError("");
    try {
      const id = await duplicateModule(moduleId);
      toast.success("복사본을 만들었습니다.");
      router.push(`/admin/modules/${id}/edit`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "모듈을 복제하지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPendingModuleId("");
    }
  }
  async function archive(moduleId: string, wasArchived: boolean) {
    setPendingModuleId(moduleId);
    setActionError("");
    try {
      await archiveModule(moduleId);
      toast.success(
        wasArchived ? "모듈을 복원했습니다." : "모듈을 보관했습니다.",
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "모듈 상태를 바꾸지 못했습니다.";
      setActionError(`${message} 잠시 후 다시 시도하세요.`);
    } finally {
      setPendingModuleId("");
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="콘텐츠 라이브러리"
        title="실습 모듈"
        description="반복해서 배정할 과제를 직접 만들고, 발행 시점의 내용을 고정된 버전으로 보관합니다."
        action={
          <Button
            onClick={create}
            className="gap-2"
            disabled={Boolean(pendingModuleId)}
            aria-busy={pendingModuleId === "create"}
          >
            <Plus className="size-4" />
            {pendingModuleId === "create" ? "만드는 중…" : "새 모듈"}
          </Button>
        }
      />
      {actionError ? (
        <InlineMessage
          kind="error"
          title="모듈 작업을 완료하지 못했습니다"
          description={actionError}
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_repeat(3,180px)]">
        <div className="space-y-2">
          <Label htmlFor="module-search">모듈 검색</Label>
          <Input
            id="module-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: AI 글쓰기"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-status-filter">상태</Label>
          <select
            id="module-status-filter"
            className="native-select w-full"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="draft">초안</option>
            <option value="active">사용 가능</option>
            <option value="archived">보관</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-category-filter">카테고리</Label>
          <select
            id="module-category-filter"
            className="native-select w-full"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">모든 카테고리</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-difficulty-filter">난이도</Label>
          <select
            id="module-difficulty-filter"
            className="native-select w-full"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="all">모든 난이도</option>
            <option value="beginner">입문</option>
            <option value="intermediate">중급</option>
            <option value="advanced">심화</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        모듈 {modules.length}개 표시 중
      </p>
      {modules.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const count = state.versions.filter(
              (version) => version.moduleTemplateId === module.id,
            ).length;
            const sequence = getAdminModuleSequence(module.draft.title);
            return (
              <Card key={module.id} className="flex flex-col">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {sequence ? (
                        <span
                          className="inline-flex h-6 min-w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 px-2 text-xs font-semibold tabular-nums text-primary"
                          aria-label={`관리자용 모듈 순서 ${sequence}번`}
                        >
                          {formatAdminModuleSequence(sequence)}
                        </span>
                      ) : null}
                      <StatusBadge value={module.status} kind="module" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      버전 {count}개
                    </span>
                  </div>
                  <CardTitle className="text-lg [overflow-wrap:anywhere]">
                    {module.draft.title}
                  </CardTitle>
                  <CardDescription className="min-h-10 [overflow-wrap:anywhere]">
                    {module.draft.summary || "한 줄 설명이 없습니다."}
                  </CardDescription>
                  {getLearningPaths(module.draft.tags).length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {getLearningPaths(module.draft.tags).map((path) => (
                        <Badge key={path} variant="secondary">
                          {path}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="mb-4 text-xs text-muted-foreground">
                    {module.draft.category} · {module.draft.estimatedMinutes}분
                    · {formatDate(module.updatedAt)} 수정
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      render={
                        <Link href={`/admin/modules/${module.id}/edit`} />
                      }
                    >
                      편집
                    </Button>
                    <Button
                      variant="outline"
                      render={
                        <Link href={`/admin/modules/${module.id}/preview`} />
                      }
                    >
                      <Eye className="size-3.5" />
                      미리보기
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={Boolean(pendingModuleId)}
                      aria-busy={pendingModuleId === module.id}
                      onClick={() => duplicate(module.id)}
                    >
                      <Copy className="size-3.5" />
                      {pendingModuleId === module.id ? "처리 중…" : "복제"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={Boolean(pendingModuleId)}
                      aria-busy={pendingModuleId === module.id}
                      onClick={() =>
                        archive(module.id, module.status === "archived")
                      }
                    >
                      <Archive className="size-3.5" />
                      {pendingModuleId === module.id
                        ? "처리 중…"
                        : module.status === "archived"
                          ? "복원"
                          : "보관"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="찾은 모듈이 없습니다"
          description="검색어를 바꾸거나 새 실습 모듈을 만들어 보세요."
          action={
            <Button variant="outline" onClick={create}>
              새 모듈
            </Button>
          }
        />
      )}
    </div>
  );
}

export function NewModuleView() {
  const router = useRouter();
  const { createModule } = useApp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setPending(true);
    setError("");
    try {
      const id = await createModule();
      router.replace(`/admin/modules/${id}/edit`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "모듈을 만들지 못했습니다.";
      setError(`${message} 잠시 후 다시 시도하세요.`);
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <FilePlus2 className="mb-3 size-6 text-foreground" />
          <CardTitle>새 실습 모듈</CardTitle>
          <CardDescription>
            빈 초안을 만든 뒤 제목, 목표, 본문과 제출 조건을 차례로 작성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <InlineMessage
              kind="error"
              title="모듈을 만들지 못했습니다"
              description={error}
            />
          ) : null}
          <Button
            className="w-full"
            onClick={create}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "초안 만드는 중…" : "빈 초안 만들기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ModuleEditorView({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const { state, saveModule, publishModule, uploadFile } = useApp();
  const module = state.modules.find((item) => item.id === moduleId);
  const [draft, setDraft] = useState<ModuleSnapshot>(() =>
    structuredClone(
      module?.draft ?? {
        title: "",
        summary: "",
        category: "미분류",
        difficulty: "beginner",
        estimatedMinutes: 30,
        tags: [],
        learningObjectives: [],
        prerequisites: [],
        submissionRequirements: [],
        completionCriteria: [],
        blocks: [],
      },
    ),
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    JSON.stringify(module?.draft ?? null),
  );
  const [focusBlockId, setFocusBlockId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== savedSignature,
    [draft, savedSignature],
  );
  useEffect(() => {
    if (!focusBlockId) return;
    const frame = requestAnimationFrame(() => {
      const target =
        document.getElementById(`block-input-${focusBlockId}`) ??
        document.getElementById(`block-type-${focusBlockId}`);
      target?.focus();
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setFocusBlockId(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusBlockId]);
  if (!module)
    return (
      <EmptyState
        title="모듈을 찾을 수 없습니다"
        description="목록에서 다시 선택해 주세요."
        action={
          <Button render={<Link href="/admin/modules" />}>목록으로</Button>
        }
      />
    );
  function set<K extends keyof ModuleSnapshot>(
    key: K,
    value: ModuleSnapshot[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function moveBlock(index: number, offset: number) {
    const blocks = [...draft.blocks];
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    set("blocks", blocks);
    setFocusBlockId(blocks[target].id);
  }
  function insertBlock(type: BlockType, position = draft.blocks.length) {
    const block = newContentBlock(type);
    const blocks = [...draft.blocks];
    blocks.splice(position, 0, block);
    set("blocks", blocks);
    setFocusBlockId(block.id);
  }
  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    set(
      "blocks",
      draft.blocks.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }
  function changeBlockType(id: string, type: BlockType) {
    const currentBlock = draft.blocks.find((item) => item.id === id);
    if (currentBlock?.asset && currentBlock.type !== type) {
      setActionError(
        "파일이 첨부된 블록은 유형을 바꿀 수 없습니다. 파일을 삭제하거나 새 블록을 추가하세요.",
      );
      return;
    }
    setActionError("");
    set(
      "blocks",
      draft.blocks.map((item) => {
        if (item.id !== id) return item;
        const replacement = { ...newContentBlock(type), id };
        if (type !== "divider") replacement.text = item.text ?? "";
        if (type === "link" && item.type === "link") replacement.url = item.url;
        return replacement;
      }),
    );
    setFocusBlockId(id);
  }
  function duplicateBlock(index: number) {
    const source = draft.blocks[index];
    const duplicate = {
      ...structuredClone(source),
      id: newContentBlock(source.type).id,
    };
    const blocks = [...draft.blocks];
    blocks.splice(index + 1, 0, duplicate);
    set("blocks", blocks);
    setFocusBlockId(duplicate.id);
  }
  function removeBlock(index: number) {
    const blocks = draft.blocks.filter((_, blockIndex) => blockIndex !== index);
    set("blocks", blocks);
    const nextFocus = blocks[Math.min(index, blocks.length - 1)];
    if (nextFocus) setFocusBlockId(nextFocus.id);
  }
  function handleEditorKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!pending && isDirty) void save();
    }
  }
  function handleBlockKeyDown(
    event: KeyboardEvent<HTMLElement>,
    index: number,
  ) {
    if (!event.altKey) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveBlock(index, -1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveBlock(index, 1);
    }
  }
  function normalized() {
    const clean = (items: string[]) =>
      items.map((item) => item.trim()).filter(Boolean);
    return {
      ...draft,
      tags: clean(draft.tags),
      learningObjectives: clean(draft.learningObjectives),
      prerequisites: clean(draft.prerequisites),
      submissionRequirements: clean(draft.submissionRequirements),
      completionCriteria: clean(draft.completionCriteria),
    };
  }
  async function save() {
    if (pending) return;
    setPending(true);
    setActionError("");
    try {
      const snapshot = normalized();
      await saveModule(moduleId, snapshot);
      setDraft(snapshot);
      setSavedSignature(JSON.stringify(snapshot));
      toast.success("초안을 저장했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "저장하지 못했습니다.";
      setActionError(`${message} 작성한 초안은 유지됐습니다. 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function publish() {
    setPending(true);
    setActionError("");
    try {
      const snapshot = normalized();
      validateModuleSnapshot(snapshot, { forPublish: true });
      await saveModule(moduleId, snapshot);
      await publishModule(moduleId);
      toast.success("새 버전을 발행했습니다.");
      router.push("/admin/modules");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "발행하지 못했습니다.";
      setActionError(`${message} 필수 항목을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  async function attach(event: ChangeEvent<HTMLInputElement>, blockId: string) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setActionError("");
    try {
      const asset = await uploadFile(file, { kind: "module", moduleId });
      setDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                text: block.text?.trim() || file.name,
                asset,
              }
            : block,
        ),
      }));
      toast.success("자료를 첨부했습니다.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "업로드하지 못했습니다.";
      setActionError(`${message} 파일을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="모듈 편집"
        title={draft.title}
        description="발행하기 전까지 초안은 계속 수정할 수 있습니다. 기존 배정 카드는 새 발행의 영향을 받지 않습니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              render={<Link href={`/admin/modules/${moduleId}/preview`} />}
            >
              <Eye className="size-4" />
              미리보기
            </Button>
            <Button
              variant="outline"
              onClick={save}
              disabled={pending || !isDirty}
              aria-busy={pending}
            >
              <Save className="size-4" />
              {pending ? "저장 중…" : "저장"}
            </Button>
            <Button onClick={publish} disabled={pending} aria-busy={pending}>
              <Send className="size-4" />
              {pending ? "처리 중…" : "발행"}
            </Button>
          </div>
        }
      />
      {actionError ? (
        <InlineMessage
          kind="error"
          title="모듈 작업을 완료하지 못했습니다"
          description={actionError}
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <div className="order-2 space-y-6 xl:order-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="제목">
                <Input
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
              <Field label="한 줄 요약">
                <Textarea
                  value={draft.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="카테고리">
                  <Input
                    value={draft.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                </Field>
                <Field label="예상 시간(분)">
                  <Input
                    type="number"
                    min={1}
                    value={draft.estimatedMinutes}
                    onChange={(e) =>
                      set("estimatedMinutes", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
              <Field label="난이도">
                <select
                  className="native-select w-full"
                  value={draft.difficulty}
                  onChange={(e) =>
                    set("difficulty", e.target.value as Difficulty)
                  }
                >
                  <option value="beginner">입문</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">심화</option>
                </select>
              </Field>
              <ListField
                label="태그"
                value={draft.tags}
                onChange={(value) => set("tags", value)}
                hint="쉼표로 구분"
              />
              <ListField
                label="학습 목표"
                value={draft.learningObjectives}
                onChange={(value) => set("learningObjectives", value)}
              />
              <ListField
                label="준비물"
                value={draft.prerequisites}
                onChange={(value) => set("prerequisites", value)}
              />
              <ListField
                label="제출 요구사항"
                value={draft.submissionRequirements}
                onChange={(value) => set("submissionRequirements", value)}
              />
              <ListField
                label="완료 기준"
                value={draft.completionCriteria}
                onChange={(value) => set("completionCriteria", value)}
              />
            </CardContent>
          </Card>
        </div>
        <Card
          className="order-1 min-w-0 overflow-visible xl:order-2"
          onKeyDown={handleEditorKeyDown}
        >
          <CardHeader className="rounded-t-xl border-b bg-zinc-50/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">본문 편집</CardTitle>
                <CardDescription className="mt-1">
                  필요한 블록을 추가하고 바로 내용을 입력하세요.
                </CardDescription>
              </div>
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                aria-live="polite"
              >
                <span
                  className={`size-2 rounded-full ${
                    isDirty ? "bg-[#9a9a9a]" : "bg-primary"
                  }`}
                />
                {isDirty ? "저장되지 않은 변경" : "저장됨"} · 본문{" "}
                {draft.blocks.length}개
              </div>
            </div>
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="빠른 블록 추가"
            >
              {quickBlockTypes.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => insertBlock(type)}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Button>
              ))}
              <label className="relative flex h-7 items-center gap-1 rounded-lg border bg-white px-2.5 text-[0.8rem] font-medium hover:bg-zinc-50 focus-within:ring-3 focus-within:ring-ring/50">
                <Paperclip className="size-3.5" aria-hidden="true" />
                기타 블록
                <select
                  aria-label="기타 블록 추가"
                  value=""
                  onChange={(event) => {
                    if (event.target.value)
                      insertBlock(event.target.value as BlockType);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="">기타 블록</option>
                  {(Object.keys(blockLabels) as BlockType[]).map((type) => (
                    <option key={type} value={type}>
                      {blockLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Code2 className="size-3.5" />
              Ctrl/⌘ + Enter 저장 · Alt + ↑↓ 블록 이동
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {draft.blocks.length ? (
              <div>
                {draft.blocks.map((block, index) => {
                  const invalidLink =
                    block.type === "link" &&
                    Boolean(block.url?.trim()) &&
                    !isSafeHttpUrl(block.url);
                  return (
                    <div key={block.id}>
                      <section
                        data-block-id={block.id}
                        className="overflow-hidden rounded-lg border bg-white transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-primary/20"
                        onKeyDown={(event) => handleBlockKeyDown(event, index)}
                      >
                        <div className="flex flex-wrap items-center gap-2 border-b bg-zinc-50/80 px-3 py-2">
                          <span className="flex size-6 items-center justify-center rounded-md border bg-white text-[11px] tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>
                          <select
                            id={`block-type-${block.id}`}
                            aria-label={`${index + 1}번 블록 유형`}
                            value={block.type}
                            onChange={(event) =>
                              changeBlockType(
                                block.id,
                                event.target.value as BlockType,
                              )
                            }
                            className="h-9 rounded-sm border border-input bg-white px-2 text-xs font-medium outline-none focus:border-ring focus:ring-3 focus:ring-primary/20"
                          >
                            {(Object.keys(blockLabels) as BlockType[]).map(
                              (type) => (
                                <option key={type} value={type}>
                                  {blockLabels[type]}
                                </option>
                              ),
                            )}
                          </select>
                          <span className="text-[11px] text-muted-foreground">
                            {index + 1} / {draft.blocks.length}
                          </span>
                          <div className="ml-auto flex gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${index + 1}번 블록 복제`}
                              onClick={() => duplicateBlock(index)}
                            >
                              <Copy />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${index + 1}번 블록 위로 이동`}
                              disabled={index === 0}
                              onClick={() => moveBlock(index, -1)}
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${index + 1}번 블록 아래로 이동`}
                              disabled={index === draft.blocks.length - 1}
                              onClick={() => moveBlock(index, 1)}
                            >
                              <ArrowDown />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${index + 1}번 블록 삭제`}
                              onClick={() => removeBlock(index)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3 p-4">
                          {block.type !== "divider" ? (
                            <>
                              <Label
                                htmlFor={`block-input-${block.id}`}
                                className="sr-only"
                              >
                                {index + 1}번 {blockLabels[block.type]} 내용
                              </Label>
                              <Textarea
                                id={`block-input-${block.id}`}
                                value={block.text ?? ""}
                                placeholder={blockPlaceholder(block.type)}
                                className={
                                  block.type === "heading"
                                    ? "min-h-14 text-lg font-medium"
                                    : block.type === "code"
                                      ? "min-h-32 font-mono text-[13px]"
                                      : "min-h-24 leading-6"
                                }
                                onChange={(event) =>
                                  updateBlock(block.id, {
                                    text: event.target.value,
                                  })
                                }
                              />
                            </>
                          ) : (
                            <div className="py-5">
                              <div className="border-t" />
                              <p className="mt-3 text-center text-xs text-muted-foreground">
                                학생 화면에서 내용 구간을 나누는 선으로
                                보입니다.
                              </p>
                            </div>
                          )}
                          {block.type === "link" ? (
                            <div className="space-y-1.5">
                              <Label htmlFor={`block-url-${block.id}`}>
                                웹 주소
                              </Label>
                              <Input
                                id={`block-url-${block.id}`}
                                type="url"
                                value={block.url ?? ""}
                                placeholder="https://example.com"
                                aria-invalid={invalidLink}
                                aria-describedby={
                                  invalidLink
                                    ? `block-url-error-${block.id}`
                                    : undefined
                                }
                                onChange={(event) =>
                                  updateBlock(block.id, {
                                    url: event.target.value,
                                  })
                                }
                              />
                              {invalidLink ? (
                                <p
                                  id={`block-url-error-${block.id}`}
                                  className="text-xs text-destructive"
                                >
                                  http 또는 https로 시작하는 주소를 입력하세요.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {block.type === "code" ? (
                            <div className="max-w-48 space-y-1.5">
                              <Label htmlFor={`block-language-${block.id}`}>
                                코드 언어
                              </Label>
                              <Input
                                id={`block-language-${block.id}`}
                                value={block.language ?? "text"}
                                placeholder="예: python"
                                onChange={(event) =>
                                  updateBlock(block.id, {
                                    language: event.target.value,
                                  })
                                }
                              />
                            </div>
                          ) : null}
                          {attachmentBlockTypes.has(block.type) ? (
                            <div className="space-y-2">
                              {block.type === "image" &&
                              isSafeAssetUrl(block.asset?.url) ? (
                                <img
                                  src={block.asset.url}
                                  alt={block.text?.trim() || block.asset.name}
                                  className="max-h-72 w-full rounded-lg border bg-zinc-50 object-contain"
                                />
                              ) : block.asset ? (
                                <div className="flex items-center gap-2 rounded-lg border bg-zinc-50 px-3 py-2 text-sm">
                                  <Paperclip className="size-4 text-muted-foreground" />
                                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                    {block.asset.name}
                                  </span>
                                </div>
                              ) : null}
                              <Label htmlFor={`block-file-${block.id}`}>
                                {block.asset ? "파일 교체" : "파일 선택"}
                              </Label>
                              <Input
                                id={`block-file-${block.id}`}
                                type="file"
                                accept={
                                  block.type === "image"
                                    ? "image/*"
                                    : block.type === "pdf"
                                      ? "application/pdf"
                                      : undefined
                                }
                                onChange={(event) => attach(event, block.id)}
                                disabled={pending}
                              />
                            </div>
                          ) : null}
                        </div>
                      </section>
                      <div className="flex items-center gap-2 py-2">
                        <span className="h-px flex-1 bg-zinc-100" />
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => insertBlock("paragraph", index + 1)}
                        >
                          <Plus />이 사이에 본문 추가
                        </Button>
                        <span className="h-px flex-1 bg-zinc-100" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed px-6 py-14 text-center">
                <FileText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  본문이 비어 있습니다.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  첫 문단을 추가해 학습 내용을 작성하세요.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => insertBlock("paragraph")}
                >
                  <Plus />첫 본문 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ModulePreviewView({ moduleId }: { moduleId: string }) {
  const { state } = useApp();
  const module = state.modules.find((item) => item.id === moduleId);
  if (!module)
    return (
      <EmptyState
        title="모듈을 찾을 수 없습니다"
        description="목록에서 다시 선택해 주세요."
      />
    );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="학생 화면 미리보기"
        title={module.draft.title}
        action={
          <Button
            variant="outline"
            render={<Link href={`/admin/modules/${moduleId}/edit`} />}
          >
            편집으로
          </Button>
        }
      />
      <div className="focus-card p-6 sm:p-8">
        <ModuleReader snapshot={module.draft} compact />
      </div>
    </div>
  );
}

export function ModuleVersionsView({ moduleId }: { moduleId: string }) {
  const { state } = useApp();
  const module = state.modules.find((item) => item.id === moduleId);
  const versions = state.versions
    .filter((item) => item.moduleTemplateId === moduleId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  if (!module)
    return (
      <EmptyState
        title="모듈을 찾을 수 없습니다"
        description="목록에서 다시 선택해 주세요."
      />
    );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="발행 이력"
        title={module.draft.title}
        description="이미 배정된 카드는 당시 버전을 계속 사용합니다."
        action={
          <Button render={<Link href={`/admin/modules/${moduleId}/edit`} />}>
            새 버전 편집
          </Button>
        }
      />
      {versions.length ? (
        <div className="space-y-3">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">
                    버전 {version.versionNumber} · {version.snapshot.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(version.publishedAt, true)} 발행 ·{" "}
                    {version.checksum}
                  </p>
                </div>
                {module.currentVersionId === version.id ? (
                  <StatusBadge value="active" kind="module" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    이전 버전
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="발행 버전이 없습니다"
          description="편집 화면에서 첫 버전을 발행하세요."
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Label className="flex-col items-stretch gap-2">
      {label}
      {children}
    </Label>
  );
}
function ListField({
  label,
  value,
  onChange,
  hint = "줄바꿈으로 구분",
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <Textarea
        value={value.join(hint.includes("쉼표") ? "," : "\n")}
        onChange={(e) =>
          onChange(e.target.value.split(hint.includes("쉼표") ? "," : "\n"))
        }
        placeholder={hint}
      />
    </Field>
  );
}

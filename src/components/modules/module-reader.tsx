/* eslint-disable @next/next/no-img-element -- private signed/blob asset URLs are dynamic and short-lived */

import { FileText, ImageIcon } from "lucide-react";
import { GqaiIcon } from "@/components/common/gqai-icon";
import type { ContentBlock, ModuleSnapshot } from "@/lib/domain/types";
import { difficultyLabel } from "@/lib/domain/status";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isSafeAssetUrl, isSafeHttpUrl } from "@/lib/domain/validation";

const LIST_BLOCK_TYPES = new Set([
  "paragraph",
  "bullet_list",
  "numbered_list",
  "checklist",
  "quote",
]);

type BlockGroup =
  | { kind: "list"; id: string; blocks: ContentBlock[] }
  | { kind: "single"; block: ContentBlock };

// Every block used to get the same loose gap regardless of its neighbor, so
// three lines of one list read as three unrelated fragments. Grouping
// consecutive list-type blocks lets them sit tight against each other while
// real section breaks (headings, code) keep the wider rhythm.
function groupBlocks(blocks: ContentBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    const previous = groups[groups.length - 1];
    if (LIST_BLOCK_TYPES.has(block.type)) {
      if (previous?.kind === "list") {
        previous.blocks.push(block);
        continue;
      }
      groups.push({ kind: "list", id: block.id, blocks: [block] });
    } else {
      groups.push({ kind: "single", block });
    }
  }
  return groups;
}

export function ModuleReader({
  snapshot,
  compact = false,
}: {
  snapshot: ModuleSnapshot;
  compact?: boolean;
}) {
  const infoLists = [
    { title: "학습 목표", items: snapshot.learningObjectives },
    { title: "준비물", items: snapshot.prerequisites },
    { title: "제출할 것", items: snapshot.submissionRequirements },
    { title: "완료 기준", items: snapshot.completionCriteria },
  ].filter((list) => list.items.length > 0);
  return (
    <article className={cn("mx-auto w-full max-w-3xl", !compact && "py-2")}>
      <header className="border-b pb-4">
        <h1 className="text-2xl font-medium leading-tight tracking-[-0.035em] sm:text-3xl">
          {snapshot.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {snapshot.category} · {difficultyLabel[snapshot.difficulty]} · 약{" "}
          {snapshot.estimatedMinutes}분
          {snapshot.summary ? ` · ${snapshot.summary}` : ""}
          {snapshot.tags.length
            ? ` · ${snapshot.tags.map((tag) => `#${tag}`).join(" ")}`
            : ""}
        </p>
      </header>
      <div className="space-y-4 py-6">
        {groupBlocks(snapshot.blocks).map((group) =>
          group.kind === "list" ? (
            <div key={group.id} className="space-y-2">
              {group.blocks.map((block) => (
                <ListItemView key={block.id} block={block} />
              ))}
            </div>
          ) : (
            <ContentBlockView key={group.block.id} block={group.block} />
          ),
        )}
      </div>
      {infoLists.length ? (
        <div className="grid gap-3 border-t pt-5 sm:grid-cols-2">
          {infoLists.map((list) => (
            <InfoList key={list.title} title={list.title} items={list.items} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

// bullet_list, numbered_list, and checklist used three different marker
// shapes (dot, arrow, check) even after they shared one color — that read
// as three formats instead of one. They're rendered identically now: a
// single list vocabulary, matching the "bullet points only" simplification.
function ListItemView({ block }: { block: ContentBlock }) {
  return (
    <div className="flex gap-3 text-[15px] leading-7">
      <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-muted-foreground" />
      {block.text}
    </div>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  if (block.type === "divider") return <Separator className="my-8" />;
  if (block.type === "heading")
    return (
      <h2 className="pt-3 text-xl font-medium tracking-tight">{block.text}</h2>
    );
  if (block.type === "code")
    return (
      <pre className="overflow-x-auto rounded-sm bg-[#1c1c1c] p-5 font-mono text-sm leading-6 text-white">
        <code>{block.text}</code>
      </pre>
    );
  if (block.type === "link")
    return isSafeHttpUrl(block.url) ? (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-zinc-50"
      >
        <GqaiIcon name="action-external-link" className="size-5" />
        <span className="min-w-0">
          <span className="block font-medium">{block.text || "참고 링크"}</span>
          <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {block.url}
          </span>
        </span>
      </a>
    ) : (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        사용할 수 없는 링크입니다.
      </div>
    );
  if (block.type === "image" && isSafeAssetUrl(block.asset?.url))
    return (
      <figure className="overflow-hidden rounded-lg border bg-muted">
        <a href={block.asset.url} target="_blank" rel="noreferrer">
          <img
            src={block.asset.url}
            alt={block.text?.trim() || block.asset.name}
            className="max-h-[560px] w-full object-contain"
            loading="lazy"
          />
        </a>
        <figcaption className="flex items-center gap-3 border-t bg-white px-4 py-3 text-sm">
          <ImageIcon className="size-4 text-foreground" />
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            {block.text?.trim() || block.asset.name}
          </span>
          <a
            href={block.asset.url}
            download={block.asset.name}
            aria-label={`${block.asset.name} 받기`}
          >
            <GqaiIcon name="action-download" className="size-5" />
          </a>
        </figcaption>
      </figure>
    );
  if (["image", "pdf", "attachment"].includes(block.type))
    return (
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <span className="flex size-9 items-center justify-center rounded-md bg-zinc-100">
          {block.type === "image" ? (
            <ImageIcon className="size-4" />
          ) : (
            <FileText className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium [overflow-wrap:anywhere]">
            {block.asset?.name ?? block.text ?? "첨부 자료"}
          </p>
          <p className="text-xs text-muted-foreground">
            {block.type === "pdf"
              ? "PDF 자료"
              : block.type === "image"
                ? "이미지"
                : "첨부파일"}
          </p>
        </div>
        {isSafeAssetUrl(block.asset?.url) ? (
          <a
            href={block.asset.url}
            download={block.asset.name}
            aria-label="자료 받기"
          >
            <GqaiIcon name="action-download" className="size-5" />
          </a>
        ) : null}
      </div>
    );
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-700">
      {block.text}
    </p>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-2 text-sm leading-6 text-muted-foreground"
            >
              <span className="text-muted-foreground">•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          등록된 내용이 없습니다.
        </p>
      )}
    </section>
  );
}

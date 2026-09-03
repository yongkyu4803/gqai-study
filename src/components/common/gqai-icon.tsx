import { cn } from "@/lib/utils";

const aliases: Record<string, string> = {
  check: "status-success",
  warning: "status-warning",
  error: "status-error",
  info: "status-info",
  calendar: "content-calendar",
  archive: "content-archive",
  search: "action-search",
  upload: "action-upload",
  download: "action-download",
};

export function GqaiIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" className={cn("size-5 shrink-0", className)}>
      <use href={`/gqai-icons.svg#${aliases[name] ?? name}`} />
    </svg>
  );
}

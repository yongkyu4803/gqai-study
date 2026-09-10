import seedModulesJson from "../../../content/demo-seed-modules.generated.json";
import type { ModuleSnapshot, ModuleTemplate } from "@/lib/domain/types";

// 순서의 원본은 운영 DB에서 뽑아낸 데모 시드다. 시드를 다시 뽑으면
// (npm run seed:export) 새 강의가 자동으로 다음 번호를 받는다.
export const ADMIN_MODULE_TITLES_IN_SEED_ORDER = seedModulesJson.map(
  (module) => (module.snapshot as ModuleSnapshot).title,
);

const adminModuleSequenceByTitle = new Map<string, number>(
  ADMIN_MODULE_TITLES_IN_SEED_ORDER.map((title, index) => [title, index + 1]),
);

export function getAdminModuleSequence(title: string) {
  return adminModuleSequenceByTitle.get(title);
}

export function formatAdminModuleSequence(sequence: number) {
  return String(sequence).padStart(2, "0");
}

export function formatAdminModuleTitle(title: string) {
  const sequence = getAdminModuleSequence(title);
  return sequence ? `${formatAdminModuleSequence(sequence)}. ${title}` : title;
}

export function compareAdminModules(
  left: ModuleTemplate,
  right: ModuleTemplate,
) {
  const leftSequence = getAdminModuleSequence(left.draft.title);
  const rightSequence = getAdminModuleSequence(right.draft.title);

  if (leftSequence && rightSequence) return leftSequence - rightSequence;
  if (leftSequence) return -1;
  if (rightSequence) return 1;
  return left.draft.title.localeCompare(right.draft.title, "ko");
}

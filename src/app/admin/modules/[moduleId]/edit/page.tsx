import { ModuleEditorView } from "@/components/admin/modules-view";
export default async function ModuleEditPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  return <ModuleEditorView moduleId={moduleId} />;
}

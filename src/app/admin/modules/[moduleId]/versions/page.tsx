import { ModuleVersionsView } from "@/components/admin/modules-view";
export default async function ModuleVersionsPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  return <ModuleVersionsView moduleId={moduleId} />;
}

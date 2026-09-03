import { ModulePreviewView } from "@/components/admin/modules-view";
export default async function ModulePreviewPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  return <ModulePreviewView moduleId={moduleId} />;
}

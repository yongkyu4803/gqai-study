import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

export const dynamic = "force-dynamic";

function downloadName(value: string | null) {
  const name = (value ?? "submission-file")
    .replace(/[\\/\u0000-\u001F\u007F]/g, "_")
    .trim();
  return name || "submission-file";
}

function contentType(value: string | null) {
  return value && /^[a-z]+\/[a-z0-9.+-]+$/i.test(value)
    ? value
    : "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { client } = await requireAdmin();
    const { itemId } = await params;
    const { data: item, error: itemError } = await client
      .from("gqai_aistudy_submission_items")
      .select("storage_path, original_name, mime_type")
      .eq("id", itemId)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item?.storage_path) {
      return Response.json(
        { error: "다운로드할 제출 파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: file, error: fileError } = await client.storage
      .from("gqai-aistudy-submission-assets")
      .download(item.storage_path);
    if (fileError || !file) {
      return Response.json(
        { error: "제출 파일을 불러오지 못했습니다." },
        { status: 404 },
      );
    }
    const name = downloadName(item.original_name);
    return new Response(await file.arrayBuffer(), {
      headers: {
        "Content-Type": contentType(item.mime_type),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "제출 파일을 내려받지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  // Production lessons use private Supabase Storage signed URLs. This route is
  // only for the local demo fixture and never exposes its files in Supabase mode.
  if (process.env.NEXT_PUBLIC_APP_MODE === "supabase") {
    return new Response(null, { status: 404 });
  }

  const { filename } = await params;
  if (!/^[a-z]+-\d{2}\.png$/.test(filename)) {
    return new Response(null, { status: 404 });
  }

  try {
    const bytes = await readFile(
      join(process.cwd(), "content/notion-assets", filename),
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

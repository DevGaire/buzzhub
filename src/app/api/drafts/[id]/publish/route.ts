import { publishDraft } from "@/components/posts/editor/actions";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const post = await publishDraft(params.id);
    return Response.json(post);
  } catch (e: any) {
    const message = e?.message || "Internal server error";
    const status =
      message === "Unauthorized" ? 401 :
      message === "Not found" ? 404 :
      message === "Already published" ? 400 :
      500;
    return Response.json({ error: message }, { status });
  }
}

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function POST(
  req: Request,
  { params: { reportId } }: { params: { reportId: string } },
) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as "RESOLVE" | "REJECT" | undefined;
  if (action !== "RESOLVE" && action !== "REJECT") {
    return Response.json({ error: "action must be RESOLVE or REJECT" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === "RESOLVE" ? "RESOLVED" : "REJECTED",
      resolvedAt: new Date(),
      resolvedById: guard.user.id,
    },
  });

  // If resolving a POST or COMMENT report, soft-hide the offending content.
  if (action === "RESOLVE") {
    if (report.targetType === "POST") {
      await prisma.post.updateMany({
        where: { id: report.targetId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } else if (report.targetType === "COMMENT") {
      await prisma.comment.deleteMany({ where: { id: report.targetId } });
    }
  }

  return Response.json({ ok: true });
}

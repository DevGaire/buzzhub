import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ReportRow from "./ReportRow";

export const metadata: Metadata = { title: "Admin · BuzzHub" };

export default async function AdminPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const [openReports, recentlyResolved, suspendedCount] = await Promise.all([
    prisma.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true },
        },
      },
    }),
    prisma.report.count({
      where: { status: { in: ["RESOLVED", "REJECTED"] } },
    }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
  ]);

  // Hydrate target labels so the row knows what it's looking at.
  const postTargetIds = openReports
    .filter((r) => r.targetType === "POST")
    .map((r) => r.targetId);
  const userTargetIds = openReports
    .filter((r) => r.targetType === "USER")
    .map((r) => r.targetId);
  const commentTargetIds = openReports
    .filter((r) => r.targetType === "COMMENT")
    .map((r) => r.targetId);

  const [posts, users, comments] = await Promise.all([
    postTargetIds.length
      ? prisma.post.findMany({
          where: { id: { in: postTargetIds } },
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { username: true, displayName: true } },
          },
        })
      : [],
    userTargetIds.length
      ? prisma.user.findMany({
          where: { id: { in: userTargetIds } },
          select: { id: true, username: true, displayName: true, suspendedAt: true },
        })
      : [],
    commentTargetIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentTargetIds } },
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { username: true, displayName: true } },
          },
        })
      : [],
  ]);

  const postById = new Map(posts.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const commentById = new Map(comments.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review reports, suspend abusive users, and keep the timeline clean.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="Open reports" value={openReports.length} />
          <Stat label="Resolved + rejected" value={recentlyResolved} />
          <Stat label="Suspended users" value={suspendedCount} />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold">Open reports</h2>
        {openReports.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Inbox zero. Nothing to review right now.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {openReports.map((r) => {
              const target =
                r.targetType === "POST"
                  ? postById.get(r.targetId)
                  : r.targetType === "USER"
                    ? userById.get(r.targetId)
                    : commentById.get(r.targetId);
              return (
                <li key={r.id} className="py-3">
                  <ReportRow
                    report={{
                      id: r.id,
                      targetType: r.targetType,
                      targetId: r.targetId,
                      reason: r.reason,
                      createdAt: r.createdAt.toISOString(),
                      reporter: r.createdBy,
                    }}
                    target={target ? serializeTarget(r.targetType, target) : null}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function serializeTarget(
  type: "POST" | "USER" | "COMMENT",
  raw: any,
): { kind: "POST" | "USER" | "COMMENT"; label: string; ownerUserId?: string; ownerUsername?: string; suspended?: boolean } {
  if (type === "USER") {
    return {
      kind: "USER",
      label: `@${raw.username} (${raw.displayName})`,
      ownerUserId: raw.id,
      ownerUsername: raw.username,
      suspended: !!raw.suspendedAt,
    };
  }
  if (type === "POST") {
    return {
      kind: "POST",
      label: raw.content?.slice(0, 100) ?? "(empty)",
      ownerUserId: raw.userId,
      ownerUsername: raw.user?.username,
    };
  }
  return {
    kind: "COMMENT",
    label: raw.content?.slice(0, 100) ?? "(empty)",
    ownerUserId: raw.userId,
    ownerUsername: raw.user?.username,
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

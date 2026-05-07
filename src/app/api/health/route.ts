import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("health check failed", err);
    return Response.json(
      { status: "error", time: new Date().toISOString() },
      { status: 503 },
    );
  }
}

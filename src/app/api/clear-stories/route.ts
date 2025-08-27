import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ message: "Invalid authorization header" }, { status: 401 });
    }

    await prisma.story.deleteMany({ where: { expiresAt: { lte: new Date() } } });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

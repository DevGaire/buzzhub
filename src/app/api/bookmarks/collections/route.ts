import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/bookmarks/collections
// Returns the current user's collections with item counts
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collections = await prisma.bookmarkCollection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        itemsCount: (c as any)._count?.items ?? 0,
      })),
    });
  } catch (e) {
    console.error("[collections][GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/bookmarks/collections
// Body: { action: 'create' | 'add_item' | 'remove_item' | 'delete' | 'rename', ... }
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const action: string = String(body.action || "");

    switch (action) {
      case "create": {
        const name = String(body.name || "").trim();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const exists = await prisma.bookmarkCollection.findFirst({ where: { userId: user.id, name } });
        if (exists) return NextResponse.json({ error: "Collection with that name already exists" }, { status: 409 });

        const created = await prisma.bookmarkCollection.create({ data: { userId: user.id, name } });
        return NextResponse.json({ ok: true, collection: created });
      }

      case "add_item": {
        const collectionId = String(body.collectionId || "");
        const postId = String(body.postId || "");
        if (!collectionId || !postId) return NextResponse.json({ error: "collectionId and postId required" }, { status: 400 });

        const collection = await prisma.bookmarkCollection.findUnique({ where: { id: collectionId } });
        if (!collection || collection.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await prisma.bookmarkCollectionItem.upsert({
          where: { collectionId_postId: { collectionId, postId } },
          update: {},
          create: { collectionId, postId },
        });
        return NextResponse.json({ ok: true });
      }

      case "remove_item": {
        const collectionId = String(body.collectionId || "");
        const postId = String(body.postId || "");
        if (!collectionId || !postId) return NextResponse.json({ error: "collectionId and postId required" }, { status: 400 });

        const collection = await prisma.bookmarkCollection.findUnique({ where: { id: collectionId } });
        if (!collection || collection.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await prisma.bookmarkCollectionItem.deleteMany({ where: { collectionId, postId } });
        return NextResponse.json({ ok: true });
      }

      case "delete": {
        const collectionId = String(body.collectionId || "");
        if (!collectionId) return NextResponse.json({ error: "collectionId required" }, { status: 400 });

        const collection = await prisma.bookmarkCollection.findUnique({ where: { id: collectionId } });
        if (!collection || collection.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await prisma.bookmarkCollection.delete({ where: { id: collectionId } });
        return NextResponse.json({ ok: true });
      }

      case "rename": {
        const collectionId = String(body.collectionId || "");
        const name = String(body.name || "").trim();
        if (!collectionId || !name) return NextResponse.json({ error: "collectionId and name required" }, { status: 400 });

        const collection = await prisma.bookmarkCollection.findUnique({ where: { id: collectionId } });
        if (!collection || collection.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const exists = await prisma.bookmarkCollection.findFirst({ where: { userId: user.id, name, NOT: { id: collectionId } } });
        if (exists) return NextResponse.json({ error: "Collection with that name already exists" }, { status: 409 });

        const updated = await prisma.bookmarkCollection.update({ where: { id: collectionId }, data: { name } });
        return NextResponse.json({ ok: true, collection: updated });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("[collections][POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

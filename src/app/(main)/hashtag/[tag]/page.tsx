import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { visiblePostFilter } from "@/lib/moderation";
import { getPostDataInclude } from "@/lib/types";
import Post from "@/components/posts/Post";
import { Hash } from "lucide-react";
import { Metadata } from "next";

interface PageProps {
  params: { tag: string };
}

export async function generateMetadata({ params: { tag } }: PageProps): Promise<Metadata> {
  return { title: `#${tag} • Buzzhub` };
}

export default async function HashtagPage({ params: { tag } }: PageProps) {
  const { user } = await validateRequest();
  if (!user) return <p className="text-destructive">You must be signed in.</p>;

  const decodedTag = decodeURIComponent(tag).toLowerCase();
  const searchTag = decodedTag.startsWith("#") ? decodedTag : `#${decodedTag}`;

  const posts = await prisma.post.findMany({
    where: {
      ...visiblePostFilter,
      content: { contains: searchTag, mode: "insensitive" },
      archived: false,
    },
    include: getPostDataInclude(user.id),
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Hash className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">#{decodedTag}</h1>
            <p className="text-muted-foreground">{posts.length} posts</p>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <Hash className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No posts with #{decodedTag} yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to use this hashtag!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Post key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

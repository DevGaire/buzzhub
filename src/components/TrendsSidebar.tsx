import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDataSelect } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import RightPanel from "./RightPanel";

export default function TrendsSidebar() {
  return (
    <aside className="sticky top-20 hidden h-fit w-[300px] flex-none xl:block">
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        }
      >
        <RightPanelServer />
      </Suspense>
    </aside>
  );
}

async function RightPanelServer() {
  const { user } = await validateRequest();
  if (!user) return null;

  const getUsersToFollow = unstable_cache(
    (userId: string) =>
      prisma.user.findMany({
        where: {
          NOT: { id: userId },
          followers: { none: { followerId: userId } },
        },
        select: getUserDataSelect(userId),
        take: 5,
      }),
    ["who-to-follow"],
    { revalidate: 10 * 60 },
  );

  const users = await getUsersToFollow(user.id);

  return <RightPanel users={users} currentUserId={user.id} />;
}

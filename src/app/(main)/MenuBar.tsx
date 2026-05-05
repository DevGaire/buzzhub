import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import MenuBarClient from "./MenuBarClient";

interface MenuBarProps {
  className?: string;
}

export default async function MenuBar({ className }: MenuBarProps) {
  const { user } = await validateRequest();

  if (!user) return null;

  // Ensure user exists in Stream (needed after switching Stream apps)
  await streamServerClient.upsertUser({
    id: user.id,
    username: user.username,
    name: user.displayName,
    image: user.avatarUrl ?? undefined,
  }).catch(() => {});

  const [unreadNotificationsCount, unreadMessagesCount] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: user.id, read: false },
    }),
    streamServerClient
      .getUnreadCount(user.id)
      .then((r) => r.total_unread_count)
      .catch(() => 0),
  ]);

  return (
    <MenuBarClient
      className={className}
      user={{
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
      }}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );
}

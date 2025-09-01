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

  const [unreadNotificationsCount, unreadMessagesCount] = await Promise.all([
    prisma.notification.count({
      where: {
        recipientId: user.id,
        read: false,
      },
    }),
    (await streamServerClient.getUnreadCount(user.id)).total_unread_count,
  ]);

  return (
    <MenuBarClient
      className={className}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );
}
import UserAvatar from "@/components/UserAvatar";
import UserAvatarWithStory from "@/components/UserAvatarWithStory";
import { NotificationData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationType } from "@prisma/client";
import { AtSign, Heart, MessageCircle, User2, CircleDot, Reply } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StoryViewer from "@/components/stories/StoryViewer";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";

interface NotificationProps {
    notification: NotificationData;
}

export default function Notification({ notification }: NotificationProps) {
    const router = useRouter();
    const [showStoryViewer, setShowStoryViewer] = useState(false);
    
    // Fetch stories if this is a story notification
    const { data: storiesData } = useQuery<{ stories: StoryData[] }>({
        queryKey: ["stories"],
        queryFn: () => kyInstance.get("/api/stories").json(),
        enabled: notification.type === "STORY",
        retry: false,
        staleTime: 30_000,
    });
    
    const notificationTypeMap: Record<
        NotificationType,
        { message: string; icon: JSX.Element; href?: string; onClick?: () => void }
    > = {
        MENTION: {
            message: `mentioned you in a post`,
            icon: <AtSign className="size-7 text-primary" />,
            href: `/posts/${notification.postId}`,
        },
        FOLLOW: {
            message: `followed you`,
            icon: <User2 className="size-7 text-primary" />,
            href: `/users/${notification.issuer.username}`,
        },
        COMMENT: {
            message: `commented on your post`,
            icon: <MessageCircle className="size-7 fill-primary text-primary" />,
            href: `/posts/${notification.postId}`,
        },
        LIKE: {
            message: `liked your post`,
            icon: <Heart className="size-7 fill-red-500 text-red-500" />,
            href: `/posts/${notification.postId}`,
        },
        REPLY: {
            message: `replied to your comment`,
            icon: <Reply className="size-7 text-primary" />,
            href: `/posts/${notification.postId}`,
        },
        COMMENT_LIKE: {
            message: `liked your comment`,
            icon: <Heart className="size-7 fill-pink-500 text-pink-500" />,
            href: `/posts/${notification.postId}`,
        },
        STORY: {
            message: `added a new story`,
            icon: <CircleDot className="size-7 text-green-500" />,
            onClick: () => {
                // Find the story index for this user
                const stories = storiesData?.stories || [];
                const storyIndex = stories.findIndex(s => s.user.username === notification.issuer.username);
                if (storyIndex >= 0) {
                    setShowStoryViewer(true);
                }
            },
        },
    };

    const config = notificationTypeMap[notification.type];
    const { message, icon } = config;
    
    const handleClick = (e: React.MouseEvent) => {
        if (config.onClick) {
            e.preventDefault();
            config.onClick();
        }
    };

    const stories = storiesData?.stories || [];
    const userStoryIndex = stories.findIndex(s => s.user.username === notification.issuer.username);

    const NotificationContent = (
        <article
            className={cn(
                "flex gap-3 rounded-2xl bg-card p-5 shadow-sm transition-colors hover:bg-card/70",
                !notification.read && "bg-primary/10",
            )}
        >
            <div className="my-1">{icon}</div>
            <div className="space-y-3">
                {notification.type === "STORY" ? (
                    <UserAvatarWithStory 
                        userId={notification.issuer.username}
                        username={notification.issuer.username}
                        avatarUrl={notification.issuer.avatarUrl} 
                        size={36}
                        showStoryRing={true}
                    />
                ) : (
                    <UserAvatar avatarUrl={notification.issuer.avatarUrl} size={36} />
                )}
                <div>
                    <span className="font-bold">{notification.issuer.displayName}</span>{" "}
                    <span>{message}</span>
                </div>
                {notification.post && (
                    <div className="line-clamp-3 whitespace-pre-line text-muted-foreground">
                        {notification.post.content}
                    </div>
                )}
            </div>
        </article>
    );

    return (
        <>
            {config.href ? (
                <Link href={config.href} className="block">
                    {NotificationContent}
                </Link>
            ) : (
                <div onClick={handleClick} className="block cursor-pointer">
                    {NotificationContent}
                </div>
            )}
            
            {/* Story Viewer Modal */}
            {showStoryViewer && userStoryIndex >= 0 && (
                <StoryViewer
                    stories={stories}
                    initialStoryIndex={userStoryIndex}
                    isOpen={showStoryViewer}
                    onClose={() => setShowStoryViewer(false)}
                />
            )}
        </>
    );
}
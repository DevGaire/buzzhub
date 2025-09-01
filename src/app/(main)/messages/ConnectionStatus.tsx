"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import useInitializeChatClient from "./useInitializeChatClient";

interface ConnectionStatusProps {
    className?: string;
}

export default function ConnectionStatus({ className }: ConnectionStatusProps) {
    const { client } = useChatContext();
    const { connectionStatus, retry } = useInitializeChatClient();
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showOfflineMessage, setShowOfflineMessage] = useState(false);

    // Monitor browser online status
    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        // Set initial state based on actual browser status
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowOfflineMessage(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOfflineMessage(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-hide offline message after 5 seconds when back online
    useEffect(() => {
        if (isOnline && showOfflineMessage) {
            const timer = setTimeout(() => {
                setShowOfflineMessage(false);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [isOnline, showOfflineMessage]);

    // Don't show anything if everything is connected
    if (isOnline && connectionStatus === 'connected') {
        return null;
    }

    const getStatusInfo = () => {
        if (!isOnline) {
            return {
                icon: WifiOff,
                text: "You're offline",
                description: "Check your internet connection",
                variant: "destructive" as const,
                showRetry: false
            };
        }

        switch (connectionStatus) {
            case 'connecting':
                return {
                    icon: RefreshCw,
                    text: "Connecting...",
                    description: "Establishing chat connection",
                    variant: "secondary" as const,
                    showRetry: false,
                    spinning: true
                };
            case 'failed':
                return {
                    icon: AlertCircle,
                    text: "Connection failed",
                    description: "Unable to connect to chat",
                    variant: "destructive" as const,
                    showRetry: true
                };
            case 'disconnected':
                return {
                    icon: WifiOff,
                    text: "Disconnected",
                    description: "Chat connection lost",
                    variant: "destructive" as const,
                    showRetry: true
                };
            default:
                return null;
        }
    };

    const statusInfo = getStatusInfo();

    if (!statusInfo) return null;

    const Icon = statusInfo.icon;

    return (
        <div className={cn(
            "flex items-center justify-between rounded-lg border p-3 text-sm",
            statusInfo.variant === "destructive"
                ? "border-destructive/20 bg-destructive/5 text-destructive"
                : "border-muted bg-muted/5",
            className
        )}>
            <div className="flex items-center gap-2">
                <Icon className={cn(
                    "size-4",
                    statusInfo.spinning && "animate-spin"
                )} />
                <div>
                    <div className="font-medium">{statusInfo.text}</div>
                    <div className="text-xs opacity-70">{statusInfo.description}</div>
                </div>
            </div>

            {statusInfo.showRetry && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={retry}
                    className="gap-1"
                >
                    <RefreshCw className="size-3" />
                    Retry
                </Button>
            )}
        </div>
    );
}

// Compact version for header/toolbar
export function ConnectionStatusIndicator({ className }: ConnectionStatusProps) {
    const { connectionStatus } = useInitializeChatClient();
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        // Set initial state based on actual browser status
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline && connectionStatus === 'connected') {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Online</span>
            </div>
        );
    }

    const getIndicator = () => {
        if (!isOnline) {
            return { color: "bg-red-500", text: "Offline" };
        }

        switch (connectionStatus) {
            case 'connecting':
                return { color: "bg-yellow-500", text: "Connecting" };
            case 'failed':
            case 'disconnected':
                return { color: "bg-red-500", text: "Disconnected" };
            default:
                return { color: "bg-gray-500", text: "Unknown" };
        }
    };

    const indicator = getIndicator();

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <div className={cn("size-2 rounded-full", indicator.color)} />
            <span className="text-xs text-muted-foreground">{indicator.text}</span>
        </div>
    );
}
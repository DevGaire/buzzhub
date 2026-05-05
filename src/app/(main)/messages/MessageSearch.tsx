"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DefaultStreamChatGenerics, useChatContext } from "stream-chat-react";
import { Search, X, MessageSquare, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, EmptyState } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { handleError } from "@/lib/error-handling";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Highlight matching text in search results
function HighlightedText({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) => (
                regex.test(part) ? (
                    <mark
                        key={index}
                        className="bg-yellow-500/30 text-yellow-200 rounded px-0.5"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            ))}
        </>
    );
}

// Format relative time
function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

export default function MessageSearch({ onClose }: { onClose: () => void }) {
    const { client, setActiveChannel } = useChatContext<DefaultStreamChatGenerics>();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
            } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
                e.preventDefault();
                handleResultClick(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, results, onClose]);

    // Debounced search
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    const runSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        setSelectedIndex(-1);

        try {
            const response = await client.search(
                { type: "messaging", members: { $in: [client.userID as string] } },
                searchQuery,
                { limit: 25 },
            );
            setResults(response.results || []);
        } catch (error) {
            console.error('Search error:', error);
            setError('Failed to search messages. Please try again.');
            handleError(error, 'Message Search');
        } finally {
            setLoading(false);
        }
    }, [client]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            runSearch(value);
        }, 300);
    };

    const handleResultClick = (result: any) => {
        setActiveChannel(result.channel);
        onClose();
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <ComponentErrorBoundary componentName="Message Search">
            <div
                className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-2xl mx-4 rounded-xl bg-[#262626] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                        <Search className="w-5 h-5 text-blue-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 bg-transparent text-white placeholder:text-muted-foreground/50 focus:outline-none text-base"
                            placeholder="Search messages..."
                            value={query}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === "Enter" && !selectedIndex && runSearch(query)}
                        />
                        {query && (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={clearSearch}
                                className="h-8 w-8 text-muted-foreground hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-white"
                        >
                            <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded">ESC</kbd>
                        </Button>
                    </div>

                    {/* Results */}
                    <div
                        ref={resultsRef}
                        className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                    >
                        {/* Loading state */}
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <LoadingSpinner className="w-5 h-5" />
                                    <span>Searching...</span>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !query && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">Search Messages</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Find messages across all your conversations
                                </p>
                                <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
                                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
                                        <span>to navigate</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
                                        <span>to select</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No results */}
                        {!loading && query && results.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">No results found</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    No messages match "{query}". Try different keywords.
                                </p>
                            </div>
                        )}

                        {/* Error state */}
                        {error && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-red-400 text-sm">{error}</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => runSearch(query)}
                                    className="mt-2"
                                >
                                    Try again
                                </Button>
                            </div>
                        )}

                        {/* Results list */}
                        {!loading && results.length > 0 && (
                            <div className="p-2">
                                <div className="text-xs text-muted-foreground px-3 py-2">
                                    {results.length} result{results.length !== 1 ? 's' : ''} found
                                </div>
                                {results.map((result, index) => {
                                    const message = result.message;
                                    const channel = result.channel;
                                    const isSelected = index === selectedIndex;

                                    // Get channel name for display
                                    const members = Object.values(channel.state?.members || {}) as any[];
                                    const otherMembers = members.filter((m: any) => m.user_id !== client.userID);
                                    const channelName = channel.data?.name ||
                                        (otherMembers.length === 1 ? otherMembers[0]?.user?.name : 'Group Chat');

                                    return (
                                        <button
                                            key={message.id}
                                            className={cn(
                                                "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150",
                                                "hover:bg-white/5",
                                                isSelected && "bg-blue-500/10 ring-1 ring-blue-500/30"
                                            )}
                                            onClick={() => handleResultClick(result)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            {/* Avatar */}
                                            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-white/5">
                                                <AvatarImage src={message.user?.image} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                                                    {message.user?.name?.[0]?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-medium text-white text-sm">
                                                        {message.user?.name || message.user?.id}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        in {channelName}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300 line-clamp-2">
                                                    <HighlightedText text={message.text || ''} query={query} />
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatRelativeTime(message.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Arrow indicator */}
                                            <ArrowRight className={cn(
                                                "w-4 h-4 text-muted-foreground transition-all",
                                                isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                                            )} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

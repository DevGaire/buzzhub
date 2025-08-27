import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import MessageSearch from "./MessageSearch";
import {
    Channel,
    ChannelHeader,
    ChannelHeaderProps,
    MessageInput,
    MessageList,
    Window,
} from "stream-chat-react";

interface ChatChannelProps {
    open: boolean;
    openSidebar: () => void;
}

export default function ChatChannel({ open, openSidebar }: ChatChannelProps) {
    const [showSearch, setShowSearch] = useState(false);
    
    return (
    <div className={cn("relative w-full md:block", !open && "hidden")}>            
    <Channel>
    <Window>
    <CustomChannelHeader openSidebar={openSidebar} onOpenSearch={() => setShowSearch(true)} />
    <MessageList typingIndicator={true} />
    <MessageInput />
    </Window>
    </Channel>
    {showSearch && <MessageSearch onClose={() => setShowSearch(false)} />}
    </div>
    );
}

interface CustomChannelHeaderProps extends ChannelHeaderProps {
    openSidebar: () => void;
}

function CustomChannelHeader({
    openSidebar,
    ...props
}: CustomChannelHeaderProps & { onOpenSearch?: () => void }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-full p-2 md:hidden">
                <Button size="icon" variant="ghost" onClick={openSidebar}>
                    <Menu className="size-5" />
                </Button>
            </div>
            <ChannelHeader {...props} />
            <div className="ms-auto p-2">
                <Button size="icon" variant="ghost" title="Search messages" onClick={props.onOpenSearch}>
                    <Search className="size-5" />
                </Button>
            </div>
        </div>
    );
}
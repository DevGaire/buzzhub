import { CommentData } from "@/lib/types";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import DeleteCommentDialog from "./DeleteCommentDialog";

interface CommentMoreButtonProps {
    comment: CommentData;
    className?: string;
    onEditClick?: () => void;
}

export default function CommentMoreButton({
    comment,
    className,
    onEditClick,
}: CommentMoreButtonProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className={className}>
                        <MoreHorizontal className="size-5 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEditClick}>
                        <span className="flex items-center gap-3">
                            <Edit className="size-4" />
                            Edit
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                        <span className="flex items-center gap-3 text-destructive">
                            <Trash2 className="size-4" />
                            Delete
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <DeleteCommentDialog
                comment={comment}
                open={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
            />
        </>
    );
}
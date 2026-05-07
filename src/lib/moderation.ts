import { Prisma } from "@prisma/client";

/**
 * Standard filter for "visible" posts: not soft-deleted, and the author
 * isn't suspended. Spread this into a `where` clause.
 */
export const visiblePostFilter = {
  deletedAt: null,
  user: { suspendedAt: null },
} satisfies Prisma.PostWhereInput;

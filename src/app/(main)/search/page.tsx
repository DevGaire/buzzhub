import { Metadata } from "next";
import SearchResults from "./SearchResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageProps {
  searchParams: { q: string };
}

export function generateMetadata({ searchParams: { q } }: PageProps): Metadata {
  return {
    title: `Search results for "${q}"`,
  };
}

export default function Page({ searchParams: { q } }: PageProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="line-clamp-2 break-all text-center text-2xl font-bold">
          Search results for &quot;{q}&quot;
        </h1>
      </div>
      <Tabs defaultValue="top">
        <TabsList className="w-full">
          <TabsTrigger value="top" className="flex-1">Top</TabsTrigger>
          <TabsTrigger value="new" className="flex-1">New</TabsTrigger>
        </TabsList>
        <TabsContent value="top" className="mt-4">
          <SearchResults query={q} sort="top" />
        </TabsContent>
        <TabsContent value="new" className="mt-4">
          <SearchResults query={q} sort="new" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
      <Tabs defaultValue="new">
        <TabsList className="w-full">
          <TabsTrigger value="new" className="flex-1">New</TabsTrigger>
          <TabsTrigger value="top" className="flex-1">Top</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4">
          <SearchResults query={q} />
        </TabsContent>
        <TabsContent value="top" className="mt-4">
          <SearchResults query={`${q} sort:top`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

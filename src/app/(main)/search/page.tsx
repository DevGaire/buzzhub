import TrendsSidebar from "@/components/TrendsSidebar";
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
        <main className="flex w-full min-w-0 gap-5">
            <div className="w-full min-w-0 space-y-5">
                <div className="rounded-2xl bg-card p-5 shadow-sm">
                    <h1 className="line-clamp-2 break-all text-center text-2xl font-bold">
                        Search results for &quot;{q}&quot;
                    </h1>
                </div>
                <Tabs defaultValue="new">
                    <TabsList>
                        <TabsTrigger value="new">New</TabsTrigger>
                        <TabsTrigger value="top">Top</TabsTrigger>
                    </TabsList>
                    <TabsContent value="new">
                        <SearchResults query={q} />
                    </TabsContent>
                    <TabsContent value="top">
                        <SearchResults query={`${q} sort:top`} />
                    </TabsContent>
                </Tabs>
            </div>
            <TrendsSidebar />
        </main>
    );
}
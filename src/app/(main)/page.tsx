import UnifiedComposer from "@/components/composer/UnifiedComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";

export default function Home() {
  return (
    <div className="space-y-4">
      <UnifiedComposer />
      <Tabs defaultValue="for-you">
        <TabsList className="w-full">
          <TabsTrigger value="for-you" className="flex-1">For you</TabsTrigger>
          <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="for-you" className="mt-4">
          <ForYouFeed />
        </TabsContent>
        <TabsContent value="following" className="mt-4">
          <FollowingFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}

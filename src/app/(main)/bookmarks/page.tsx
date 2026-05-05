import { Metadata } from "next";
import Bookmarks from "./Bookmarks";

export const metadata: Metadata = {
  title: "Bookmarks",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Bookmarks</h1>
      </div>
      <Bookmarks />
    </div>
  );
}

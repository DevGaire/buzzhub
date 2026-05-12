import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import MenuBar from "./MenuBar";
import Navbar from "./Navbar";
import OnboardingWizard from "./OnboardingWizard";
import SessionProvider from "./SessionProvider";
import TrendsSidebar from "@/components/TrendsSidebar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateRequest();

  if (!session.user) redirect("/login");

  return (
    <SessionProvider value={session}>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="mx-auto flex max-w-[1440px] items-start gap-5 px-4 py-5 sm:px-6">
          {/* Left sidebar */}
          <aside className="hidden lg:block w-[260px] flex-none">
            <MenuBar className="sticky top-20" />
          </aside>

          {/* Center content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

          {/* Right panel */}
          <TrendsSidebar />
        </div>

        {/* Mobile bottom nav */}
        <MenuBar className="sticky bottom-0 z-40 flex w-full justify-around border-t bg-card/95 backdrop-blur-md p-3 lg:hidden" />
        <OnboardingWizard />
      </div>
    </SessionProvider>
  );
}

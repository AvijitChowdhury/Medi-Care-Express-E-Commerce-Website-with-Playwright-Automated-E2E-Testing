import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LiveChatWidget } from "@/components/site/LiveChatWidget";
import { useFbEngagement } from "@/hooks/use-fb-engagement";

export const Route = createFileRoute("/_shop")({
  component: ShopLayout,
});

function ShopLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useFbEngagement(pathname);
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <LiveChatWidget />
    </div>
  );
}

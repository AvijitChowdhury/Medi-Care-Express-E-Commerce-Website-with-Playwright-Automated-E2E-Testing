import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">৪০৪</h1>
        <h2 className="mt-4 text-xl font-semibold">পেজটি খুঁজে পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">আপনি যে পেজটি খুঁজছেন সেটি নেই অথবা সরানো হয়েছে।</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">পেজটি লোড হয়নি</h1>
        <p className="mt-2 text-sm text-muted-foreground">কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">আবার চেষ্টা করুন</button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">হোমে ফিরুন</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "মেডিকেয়ার — স্বাস্থ্য ও সৌন্দর্য পণ্যের অনলাইন স্টোর" },
      { name: "description", content: "১০০% অরিজিনাল ভিটামিন, সাপ্লিমেন্ট, স্কিন কেয়ার ও হেয়ার কেয়ার পণ্য। ক্যাশ অন ডেলিভারি ও পার্শিয়াল অনলাইন পেমেন্ট সুবিধা।" },
      { property: "og:title", content: "মেডিকেয়ার — স্বাস্থ্য ও সৌন্দর্য পণ্য" },
      { property: "og:description", content: "১০০% অরিজিনাল প্রিমিয়াম পণ্য, সারা দেশে দ্রুত ডেলিভারি।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}


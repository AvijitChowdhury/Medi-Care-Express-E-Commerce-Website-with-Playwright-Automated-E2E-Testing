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
import { FB_PIXEL_BOOTSTRAP, FB_PIXEL_ID } from "@/lib/fb-pixel";

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
      { property: "og:title", content: "মেডিকেয়ার — স্বাস্থ্য ও সৌন্দর্য পণ্যের অনলাইন স্টোর" },
      { property: "og:description", content: "১০০% অরিজিনাল ভিটামিন, সাপ্লিমেন্ট, স্কিন কেয়ার ও হেয়ার কেয়ার পণ্য। ক্যাশ অন ডেলিভারি ও পার্শিয়াল অনলাইন পেমেন্ট সুবিধা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "মেডিকেয়ার — স্বাস্থ্য ও সৌন্দর্য পণ্যের অনলাইন স্টোর" },
      { name: "twitter:description", content: "১০০% অরিজিনাল ভিটামিন, সাপ্লিমেন্ট, স্কিন কেয়ার ও হেয়ার কেয়ার পণ্য। ক্যাশ অন ডেলিভারি ও পার্শিয়াল অনলাইন পেমেন্ট সুবিধা।" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f9279bff-e124-4d5b-9960-a6a7ea7c6c3d/id-preview-dfe3183d--fe4cb71a-8b25-4aa3-944b-b6c63c789591.lovable.app-1780041660951.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f9279bff-e124-4d5b-9960-a6a7ea7c6c3d/id-preview-dfe3183d--fe4cb71a-8b25-4aa3-944b-b6c63c789591.lovable.app-1780041660951.png" },
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
        <script dangerouslySetInnerHTML={{ __html: FB_PIXEL_BOOTSTRAP }} />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
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


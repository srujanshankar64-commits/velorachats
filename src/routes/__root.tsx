import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { UnreadProvider } from "@/lib/unread";

import appCss from "../styles.css?url";

const SUPABASE_URL = "https://uavwrahakmzmfdwqwnek.supabase.co";
const SITE = "https://shhchats.in";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0D0D0F] px-4 overflow-hidden">
      <span className="absolute text-[120px] font-semibold leading-none text-[#8AB4F8] opacity-[0.15] select-none">404</span>
      <div className="relative max-w-md text-center">
        <h1 className="text-2xl text-[#E8EAED]">Page not found</h1>
        <p className="mt-2 text-sm text-[#9AA0A6]">This page wandered off into the night.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-[#8AB4F8] px-6 py-3 text-sm text-[#0D0D0F]">Back to ShhChats</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0D0F] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-[#E8EAED]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#9AA0A6]">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-full bg-[#8AB4F8] px-6 py-3 text-sm text-[#0D0D0F]">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ShhChats — Late night conversations" },
      { name: "description", content: "ShhChats — late night anonymous chat. Talk to a real person when your mind won't stop. Free and anonymous." },
      { name: "theme-color", content: "#0D0D0F" },
      { property: "og:site_name", content: "ShhChats" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE + "/" },
      { property: "og:title", content: "ShhChats — Late night conversations" },
      { property: "og:description", content: "Talk to a real person when your mind won't stop. Free and anonymous." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: SITE + "/" },
        { property: "og:image", content: SITE + "/og-image.jpg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:type", content: "image/jpeg" },
        { name: "twitter:image", content: SITE + "/og-image.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE + "/" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "preconnect", href: SUPABASE_URL, crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Cloudflare Web Analytics */}
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "118112b5573b4eadbd1f78c0e043f479"}'></script>
      </head>
      <body>
        {children}
        <div id="monetag-ipp" style={{ position: "fixed", bottom: "70px", left: "0", right: "0", zIndex: 999, textAlign: "center", pointerEvents: "none" }}></div>
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UnreadProvider>
          <Outlet />
          <Toaster position="top-center" theme="dark" toastOptions={{ style: { background: "#1A1A1F", color: "#E8EAED", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "100px" } }} />
        </UnreadProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

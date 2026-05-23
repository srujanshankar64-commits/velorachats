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

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl text-white">404</h1>
        <p className="mt-2 text-sm text-[#888]">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 text-sm text-white">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#888]">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-full bg-[#7C3AED] px-6 py-3 text-sm text-white">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "Velora — Meet real people, chat instantly" },
      { name: "description", content: "Velora is a free, safe chat app to meet real people near you. Discover, message, and join public rooms instantly." },
      { name: "theme-color", content: "#000000" },
      { name: "google-adsense-account", content: "ca-pub-XXXXXXXXXXXXXXXX" },
      { property: "og:site_name", content: "Velora" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: "/logo.jpg" },
      { rel: "apple-touch-icon", href: "/logo.jpg" },
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
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
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
          <Toaster position="top-center" theme="dark" />
        </UnreadProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

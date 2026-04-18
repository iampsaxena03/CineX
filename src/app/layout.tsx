import type { Metadata, Viewport } from "next";
import Navbar from "@/components/ui/Navbar";
import CommandPalette from "@/components/ui/CommandPalette";
import InstallPWA from "@/components/ui/InstallPWA";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cinexp.vercel.app'),
  title: {
    default: "CineXP | Premium Streaming",
    template: "%s | CineXP",
  },
  description: "Advanced Movie & TV Series streaming platform. Watch the latest blockbusters and trending shows in high quality.",
  keywords: ["movies", "tv shows", "streaming", "cinexp", "watch online", "hd", "series", "cinema"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineXP",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CineXP",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "CineXP | Premium Streaming",
    description: "Advanced Movie & TV Series streaming platform. Watch the latest blockbusters and trending shows in high quality.",
    siteName: "CineXP",
    images: [{ url: "/icon-512x512.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CineXP | Premium Streaming",
    description: "Advanced Movie & TV Series streaming platform.",
    images: ["/icon-512x512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#04010a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <CommandPalette />
        <InstallPWA />
        {children}
      </body>
    </html>
  );
}

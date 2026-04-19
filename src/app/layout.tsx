import type { Metadata, Viewport } from "next";
import Navbar from "@/components/ui/Navbar";
import CommandPalette from "@/components/ui/CommandPalette";
import InstallPWA from "@/components/ui/InstallPWA";
import CacheBuster from "@/components/CacheBuster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | CineXP",
    default: "CineXP | Premium Streaming",
  },
  description: "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineXP",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CineXP",
  metadataBase: new URL('https://cinexp.site'),
  openGraph: {
    title: "CineXP | Premium Streaming",
    description: "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
    url: 'https://cinexp.site',
    siteName: 'CineXP',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineXP | Premium Streaming',
    description: 'Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.',
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
        <CacheBuster />
        {children}
      </body>
    </html>
  );
}

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
  metadataBase: new URL('https://www.cinexp.site'),
  openGraph: {
    title: "CineXP | Premium Streaming",
    description: "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
    url: 'https://www.cinexp.site',
    siteName: 'CineXP',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.cinexp.site/og-rect-v2.png',
        width: 1200,
        height: 630,
        alt: 'CineXP - Premium Streaming',
      },
      {
        url: 'https://www.cinexp.site/og-square-v2.png',
        width: 800,
        height: 800,
        alt: 'CineXP - Premium Streaming',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineXP | Premium Streaming',
    description: 'Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.',
    images: ['https://www.cinexp.site/og-rect-v2.png'],
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
      <head>
        <link rel="preconnect" href="https://pl29183322.profitablecpmratenetwork.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.highperformanceformat.com" crossOrigin="anonymous" />
      </head>
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

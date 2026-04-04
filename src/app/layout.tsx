import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import ProgressiveBlur from "@/components/ui/ProgressiveBlur";
import CommandPalette from "@/components/ui/CommandPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineX | Premium Streaming",
  description: "Advanced Movie & TV Series streaming platform",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "CineX",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#9d00ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ProgressiveBlur />
        <Navbar />
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}

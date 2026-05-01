import type { Metadata, Viewport } from "next";
import Navbar from "@/components/ui/Navbar";
import InstallPWA from "@/components/ui/InstallPWA";
import CacheBuster from "@/components/CacheBuster";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { 
  Montserrat, 
  Oswald, 
  Michroma, 
  Bebas_Neue, 
  Satisfy 
} from 'next/font/google';
import "./globals.css";

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['300', '400', '500', '600', '700', '800', '900'] });
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', weight: ['200', '300', '400', '500', '600', '700'] });
const michroma = Michroma({ subsets: ['latin'], variable: '--font-michroma', weight: '400' });
const bebas = Bebas_Neue({ subsets: ['latin'], variable: '--font-bebas', weight: '400' });
const satisfy = Satisfy({ subsets: ['latin'], variable: '--font-satisfy', weight: '400' });

const fonts = [montserrat, oswald, michroma, bebas, satisfy];

function getDailyFont() {
  // Use a stable date seed (YYYY-MM-DD) to ensure consistency across server/client on the same day
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  
  // Simple hash for the date string
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % fonts.length;
  return fonts[index];
}

export const revalidate = 3600; // Revalidate every hour to check for date changes
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
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
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
  const selectedFont = getDailyFont();

  return (
    <html lang="en" className={selectedFont.variable} style={{ "--font-main": selectedFont.style.fontFamily } as any}>
      <head>
        <link rel="preconnect" href="https://pl29183322.profitablecpmratenetwork.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.highperformanceformat.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://www.cinexp.site/#website",
                  "url": "https://www.cinexp.site/",
                  "name": "CineXP",
                  "alternateName": ["CineXP.site", "Cine XP"],
                  "description": "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
                  "publisher": {
                    "@id": "https://www.cinexp.site/#organization"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://www.cinexp.site/#organization",
                  "name": "CineXP",
                  "url": "https://www.cinexp.site/",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.cinexp.site/og-square-v2.png",
                    "width": 800,
                    "height": 800
                  }
                }
              ]
            }),
          }}
        />
      </head>
      <body>
        <BackgroundGradient />
        <Navbar />
        <InstallPWA />
        <CacheBuster />
        <main>
          {children}
        </main>
        <Analytics />
        <SpeedInsights />
        
        {/* Adsterra Social Bar - High CPM format that doesn't disrupt UX */}
        <Script src="https://eagerdazzle.com/5f/69/5d/5f695dea02fd6964afe023097b2af686.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

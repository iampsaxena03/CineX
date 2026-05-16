import { Metadata } from 'next';
import DownloadClient from './DownloadClient';

interface PageProps {
  params: {
    token: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Preparing Download | CineXP',
    description: 'Your download is being prepared. Please wait 10 seconds.',
    robots: { index: false, follow: false } // Don't index interstitial pages
  };
}

export default function DownloadPage({ params }: PageProps) {
  return (
    <main className="page-wrapper">
      <DownloadClient token={params.token} />
    </main>
  );
}

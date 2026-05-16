import type { Metadata } from 'next';
import DownloadClient from './DownloadClient';
import { getAdSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Preparing Download | CineXP',
  description: 'Your download is being prepared.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DownloadPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const adSettings = await getAdSettings();

  return (
    <div className="page-wrapper container">
      <DownloadClient 
        token={resolvedParams.token} 
        waitingPageEnabled={adSettings.waitingPageEnabled} 
      />
    </div>
  );
}

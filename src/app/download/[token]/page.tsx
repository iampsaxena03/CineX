import type { Metadata } from 'next';
import DownloadClient from './DownloadClient';

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
  return (
    <div className="page-wrapper container">
      <DownloadClient token={resolvedParams.token} />
    </div>
  );
}

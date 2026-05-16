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

export default function DownloadPage({ params }: { params: { token: string } }) {
  return (
    <div className="page-wrapper container">
      <DownloadClient token={params.token} />
    </div>
  );
}

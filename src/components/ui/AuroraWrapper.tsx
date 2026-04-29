'use client';

import dynamic from 'next/dynamic';

const Aurora = dynamic(() => import('./Aurora'), { ssr: false });

export default function AuroraWrapper() {
  return <Aurora />;
}

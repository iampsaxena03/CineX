import { prisma } from '@/lib/admin'
import AnalyticsClient from './AnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const [
    totalMovies,
    totalTV,
    totalDownloads,
    totalSections,
    recentDownloads,
    sectionsWithCounts,
  ] = await Promise.all([
    prisma.mediaPost.count({ where: { type: 'movie' } }),
    prisma.mediaPost.count({ where: { type: 'tv' } }),
    prisma.downloadLink.count(),
    prisma.homeSection.count(),
    prisma.downloadLink.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { quality: true, label: true, size: true, createdAt: true }
    }),
    prisma.homeSection.findMany({
      orderBy: { order: 'asc' },
      select: {
        title: true,
        type: true,
        visible: true,
        autoFill: true,
        _count: { select: { items: true } }
      }
    }),
  ])

  return (
    <AnalyticsClient
      totalMovies={totalMovies}
      totalTV={totalTV}
      totalDownloads={totalDownloads}
      totalSections={totalSections}
      recentDownloads={recentDownloads}
      sectionsWithCounts={sectionsWithCounts}
    />
  )
}

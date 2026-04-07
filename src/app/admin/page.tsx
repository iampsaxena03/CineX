import { prisma } from '@/lib/admin'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [movieCount, tvCount, downloadCount, sectionCount, recentLinks] = await Promise.all([
    prisma.mediaPost.count({ where: { type: 'movie' } }),
    prisma.mediaPost.count({ where: { type: 'tv' } }),
    prisma.downloadLink.count(),
    prisma.homeSection.count(),
    prisma.downloadLink.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        mediaPost: { select: { tmdbId: true, type: true } },
        episode: {
          select: {
            episodeNumber: true,
            season: { select: { seasonNumber: true, mediaPost: { select: { tmdbId: true, type: true } } } }
          }
        }
      }
    })
  ])

  return (
    <DashboardClient
      movieCount={movieCount}
      tvCount={tvCount}
      downloadCount={downloadCount}
      sectionCount={sectionCount}
      recentLinks={recentLinks}
    />
  )
}

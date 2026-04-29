'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

// Redirect to main home-layout page since the section 
// is edited in the split-panel view there
export default function SectionDetailPage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    router.replace('/admin/home-layout')
  }, [router])

  return (
    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
      Redirecting to Home Layout editor...
    </div>
  )
}

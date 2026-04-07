'use client'

import { useEffect, useRef, useState } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color?: string
}

export default function StatCard({ label, value, icon, color = 'var(--primary)' }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const animatedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (animatedRef.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true
          const duration = 1200
          const startTime = performance.now()
          
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayValue(Math.floor(eased * value))
            
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div className="admin-stat-card" ref={cardRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="admin-stat-label">{label}</div>
        <div style={{ color, opacity: 0.6, fontSize: '1.3rem' }}>{icon}</div>
      </div>
      <div className="admin-stat-value">{displayValue}</div>
    </div>
  )
}

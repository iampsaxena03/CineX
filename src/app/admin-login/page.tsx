'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.push('/admin')
      } else {
        setError('Invalid credentials. Access denied.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-login-page">


      <div className="admin-login-card">
        {/* Animated sphere */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, var(--accent), var(--primary))',
            boxShadow: '0 4px 20px rgba(157, 0, 255, 0.5), inset 0 1px 3px rgba(255,255,255,0.3)',
            animation: 'pulse 3s ease-in-out infinite',
          }} />
        </div>

        <h1>CINEXP Control</h1>
        <p>Enter your admin password to continue</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              className="admin-input"
              placeholder="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.05em', width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="password"
              className="admin-input"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.1em', width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isLoading || !password || !username}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem',
              fontSize: '0.95rem',
              opacity: isLoading || !password || !username ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Authenticating...' : 'Enter Control Room'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(157, 0, 255, 0.5); }
          50% { transform: scale(1.1); box-shadow: 0 4px 30px rgba(157, 0, 255, 0.7); }
        }
      `}</style>
    </div>
  )
}

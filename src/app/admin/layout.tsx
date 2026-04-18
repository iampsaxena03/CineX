import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { ToastProvider } from '@/components/admin/Toast'
import { isValidSessionFull, ADMIN_COOKIE } from '@/lib/auth'

export const metadata = {
  title: 'CineX Control Panel',
  description: 'Admin panel for managing CineX streaming platform',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth gate: defense-in-depth beyond proxy
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_COOKIE)

  if (!sessionCookie) {
    redirect('/admin-login')
  }

  const valid = await isValidSessionFull(sessionCookie.value)
  if (!valid) {
    redirect('/admin-login')
  }

  return (
    <ToastProvider>
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}

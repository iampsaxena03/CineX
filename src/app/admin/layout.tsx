import AdminSidebar from '@/components/admin/AdminSidebar'
import { ToastProvider } from '@/components/admin/Toast'

export const metadata = {
  title: 'CineX Control Panel',
  description: 'Admin panel for managing CineX streaming platform',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

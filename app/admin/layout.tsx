/**
 * Shared admin layout — provides sidebar navigation and consistent shell.
 *
 * Visual shell only. Auth is still handled per-page via checkIsAdmin.
 * This layout does NOT enforce auth — individual pages remain responsible.
 */

import AdminHeader from './_components/admin-header'
import AdminSidebar from './_components/admin-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* Main content — offset by sidebar width on desktop */}
      <main className="md:pl-60">
        <AdminHeader />
        {children}
      </main>
    </div>
  )
}

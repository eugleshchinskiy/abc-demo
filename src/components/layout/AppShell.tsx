import { Outlet } from 'react-router'
import { Toaster } from '../ui/primitives'
import { SearchDialog, UpgradeDialog } from './Dialogs'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="min-h-dvh bg-black text-zinc-100">
      <Sidebar />
      <div className="pl-[68px]">
        <Header />
        <main className="px-4 pb-16 sm:px-6">
          <Outlet />
        </main>
      </div>
      <SearchDialog />
      <UpgradeDialog />
      <Toaster />
    </div>
  )
}

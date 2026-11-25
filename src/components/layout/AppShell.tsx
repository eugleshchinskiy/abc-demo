import { Outlet } from 'react-router'
import { Toaster } from '../ui/primitives'
import { Dialogs } from './Dialogs'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useGenerationWatcher } from './useGenerationWatcher'

export function AppShell() {
  useGenerationWatcher()
  return (
    <div className="min-h-dvh bg-bg-dark text-white">
      <Sidebar />
      <div className="pl-16">
        <Header />
        <main className="pt-4 pb-16">
          <Outlet />
        </main>
      </div>
      <Dialogs />
      <Toaster />
    </div>
  )
}

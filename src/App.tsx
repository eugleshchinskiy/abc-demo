import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { ChatPage, NotFoundPage, SettingsPage } from './pages/PlaceholderPages'
import { ResultsPage } from './pages/ResultsPage'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'results', element: <ResultsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'
import { ComposerProvider } from './state/ComposerProvider'
import { UiProvider } from './state/UiProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
})

// The mock API (MSW) must be ready before the first request is made.
const { startMockApi } = await import('./mocks/browser')
await startMockApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <ComposerProvider>
          <App />
        </ComposerProvider>
      </UiProvider>
    </QueryClientProvider>
  </StrictMode>,
)

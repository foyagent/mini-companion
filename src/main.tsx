import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

// 仅在需要真机调试时启用 vConsole，避免桌面 UI 查验时出现绿色悬浮按钮。
const shouldEnableVConsole =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('debug')

if (shouldEnableVConsole) {
  import('vconsole').then((module) => {
    new module.default({ theme: 'dark' })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

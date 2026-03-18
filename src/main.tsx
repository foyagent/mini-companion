import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 开发模式启用 vconsole
if (import.meta.env.DEV) {
  import('vconsole').then((module) => {
    new module.default()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

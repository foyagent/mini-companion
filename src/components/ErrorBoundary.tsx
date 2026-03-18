import { Component, type ErrorInfo } from 'react'
import type { ErrorBoundaryProps, ErrorBoundaryState } from '../types'

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError() {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mini Companion render error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
            <div className="text-5xl">😵‍💫</div>
            <h1 className="mt-4 text-2xl font-semibold">Mini 刚刚摔了一跤</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              页面渲染出了点意外。刷新一下通常就能恢复，如果还不行，再检查最近的改动或控制台日志。
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-cyan-400 px-5 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              刷新页面
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

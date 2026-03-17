import Live2DCanvas from './components/Live2DCanvas'

function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center">
        <section className="max-w-2xl space-y-6">
          <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-200">
            Mini Companion · React + Vite + Live2D
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
              给 Mini 造一个会动、会陪伴、还能继续进化的小搭子。
            </h1>
            <p className="text-base leading-8 text-slate-300 md:text-lg">
              项目骨架已经完成，当前页面集成了 Live2D 展示区。下一步可以接入专属模型、对话能力、状态面板和更多互动逻辑。
            </p>
          </div>
          <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold text-white">UI 基座</div>
              <p className="mt-2">Vite + React + TypeScript，开发体验清爽利落。</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold text-white">样式系统</div>
              <p className="mt-2">Tailwind v4 已接入，页面样式可以直接堆起来。</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold text-white">Live2D</div>
              <p className="mt-2">已预留模型加载逻辑，后续替换模型 URL 即可。</p>
            </div>
          </div>
        </section>

        <section className="flex-1">
          <Live2DCanvas />
        </section>
      </div>
    </main>
  )
}

export default App

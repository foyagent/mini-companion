import { useMemo, useState } from 'react'
import Live2DCanvas from './components/Live2DCanvas'

type ChatRole = 'mini' | 'user'

type ChatMessage = {
  id: number
  role: ChatRole
  content: string
}

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'mini',
    content: '晚上好，老板。Live2D 已站岗，随时可以继续接 LLM、语音和动作系统。',
  },
  {
    id: 2,
    role: 'user',
    content: '先把基础界面搭起来，后面再慢慢加脑子。',
  },
  {
    id: 3,
    role: 'mini',
    content: '收到。现在这版先负责好看、能聊、能继续扩展。',
  },
]

function App() {
  const [messages, setMessages] = useState(starterMessages)
  const [input, setInput] = useState('')

  const stats = useMemo(
    () => [
      { label: '模型状态', value: 'Shizuku 在线' },
      { label: '对话消息', value: `${messages.length} 条` },
      { label: '下个目标', value: '接入 LLM / TTS' },
    ],
    [messages.length],
  )

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
    }

    const reply: ChatMessage = {
      id: Date.now() + 1,
      role: 'mini',
      content: `收到：${text}。等你把后端接上，我就不只是捧场了。`,
    }

    setMessages((current) => [...current, userMessage, reply])
    setInput('')
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10 md:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-8">
            <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-200">
              Mini Companion · MVP
            </div>
            <div className="mt-5 space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                会动的 Mini，先落地成一个能看的雏形。
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                现在已经有 Live2D 展示、基础聊天面板和状态卡片。下一步把大模型、语音、动作触发、长期记忆接进来，这只小家伙就更像样了。
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="text-sm text-slate-400">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <Live2DCanvas />
        </section>

        <section className="flex min-h-[720px] flex-col rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-lg font-semibold">聊天面板</div>
              <div className="text-sm text-slate-400">先用本地回声逻辑占位，后面可直连模型服务。</div>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              Prototype
            </div>
          </div>

          <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((message) => {
              const isMini = message.role === 'mini'
              return (
                <article
                  key={message.id}
                  className={`flex ${isMini ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-lg ${
                      isMini
                        ? 'rounded-bl-md border border-cyan-400/20 bg-cyan-400/10 text-cyan-50'
                        : 'rounded-br-md border border-white/10 bg-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {isMini ? 'Mini' : 'You'}
                    </div>
                    <div>{message.content}</div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/80 p-3">
            <label htmlFor="chat-input" className="sr-only">
              输入消息
            </label>
            <textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              rows={4}
              placeholder="比如：Mini，明天帮我加个语音播报。"
              className="w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-500">Enter 发送，Shift + Enter 换行</p>
              <button
                type="button"
                onClick={handleSend}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                发送
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

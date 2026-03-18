import { useEffect, useMemo, useState } from 'react'
import Live2DCanvas from './components/Live2DCanvas'
import { openClawWebSocket } from './services/websocket'
import { isVolcTtsConfigured, speakText } from './services/tts'
import type { ChatMessage, ConnectionStatus } from './types'

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'mini',
    content: '早上好，老板。我现在能试着连 OpenClaw 了，接上就不只是回声机。',
    timestamp: Date.now(),
  },
]

const statusDotStyles: Record<ConnectionStatus, string> = {
  connecting: 'bg-yellow-500',
  connected: 'bg-green-500',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
}

const statusLabels: Record<ConnectionStatus, string> = {
  connecting: '连接中',
  connected: '已连接',
  disconnected: '未连接',
  error: '连接异常',
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages)
  const [input, setInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)

  useEffect(() => {
    const unsubscribeStatus = openClawWebSocket.subscribeStatus((status) => {
      setConnectionStatus(status)
    })

    const unsubscribeError = openClawWebSocket.subscribeError((message) => {
      setErrorMessage(message)
    })

    void openClawWebSocket.connect().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : '连接 OpenClaw 失败。')
    })

    return () => {
      unsubscribeStatus()
      unsubscribeError()
      openClawWebSocket.disconnect()
    }
  }, [])

  const stats = useMemo(
    () => [
      {
        label: '模型状态',
        value: isModelLoading ? 'Shizuku 加载中' : 'Shizuku 在线',
        icon: '🫧',
        mobileHidden: false,
      },
      {
        label: '连接状态',
        value: statusLabels[connectionStatus],
        icon: '🛰️',
        mobileHidden: false,
      },
      {
        label: 'TTS 状态',
        value: isVolcTtsConfigured() ? '火山已配置' : '待配置',
        icon: '🔊',
        mobileHidden: true,
      },
    ],
    [connectionStatus, isModelLoading],
  )

  const handleRetryConnection = async () => {
    setErrorMessage('')

    try {
      await openClawWebSocket.connect()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '重连失败。')
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isSending) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const assistantMessageId = Date.now() + 1
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'mini',
      content: '',
      timestamp: Date.now(),
    }

    setMessages((current) => [...current, userMessage, assistantPlaceholder])
    setInput('')
    setErrorMessage('')
    setIsSending(true)

    try {
      await openClawWebSocket.sendMessage(text, {
        onChunk: (_, fullText) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId ? { ...message, content: fullText } : message,
            ),
          )
        },
        onDone: async (fullText) => {
          const finalText = fullText.trim() || '……Mini 这次好像想了很多，但没说出来。'
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId ? { ...message, content: finalText } : message,
            ),
          )

          if (isVolcTtsConfigured()) {
            try {
              await speakText(finalText)
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'TTS 播放失败。')
            }
          }

          setIsSending(false)
        },
        onError: (error) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `连接出了点问题：${error.message}` }
                : message,
            ),
          )
          setErrorMessage(error.message)
          setIsSending(false)
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败。'
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId ? { ...item, content: `发送失败：${message}` } : item,
        ),
      )
      setErrorMessage(message)
      setIsSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] lg:gap-6">
        <section className="order-1 flex min-h-[46vh] flex-col gap-4 lg:min-h-[780px]">
          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-200">
                Mini Companion · MVP
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-slate-300 md:hidden">
                <span className={`h-2 w-2 rounded-full ${statusDotStyles[connectionStatus]}`} />
                {statusLabels[connectionStatus]}
              </div>
            </div>

            <div className="mt-4 space-y-3 md:mt-5 md:space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                会动的 Mini，开始长脑子也开口说话。
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base md:leading-8 lg:text-lg">
                这版把 OpenClaw 对话和火山 TTS 预埋进来了。现在能走真实消息链路，后面再把动作触发、表情和长期记忆慢慢接齐。
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className={`${item.mobileHidden ? 'hidden lg:block' : 'block'} bg-white rounded-xl shadow-md p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl shadow-sm">
                      <span aria-hidden="true">{item.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 md:text-base">
                        {item.value}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
            {isModelLoading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/45 backdrop-blur-sm">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                <p className="text-sm font-medium text-slate-600">Mini 正在梳头，模型加载中…</p>
              </div>
            ) : null}

            <div className="absolute inset-x-4 top-4 z-10 hidden items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur md:flex">
              <div>
                <div className="font-semibold text-slate-800">Live2D 展示区</div>
                <div className="text-xs text-slate-500">渐变背景 + 响应式舞台，移动端也能舒展开</div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                Tap / Click 可互动
              </div>
            </div>

            <div className="h-full min-h-[360px] p-3 pt-16 md:min-h-[520px] md:p-4 md:pt-20 lg:min-h-[640px]">
              <Live2DCanvas
                onLoadStart={() => setIsModelLoading(true)}
                onLoadComplete={() => setIsModelLoading(false)}
                onLoadError={(message) => {
                  setIsModelLoading(false)
                  setErrorMessage(message)
                }}
              />
            </div>
          </div>
        </section>

        <section className="order-2 flex min-h-[48vh] flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-5 lg:min-h-[780px] lg:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-lg font-semibold">聊天面板</div>
              <div className="text-sm text-slate-400">OpenClaw 流式回复 + 可选火山 TTS 播放</div>
            </div>
            <div
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 md:inline-flex"
              title={statusLabels[connectionStatus]}
              aria-label={statusLabels[connectionStatus]}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusDotStyles[connectionStatus]}`}
                aria-hidden="true"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              <div className="flex items-center justify-between gap-3">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => void handleRetryConnection()}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                >
                  重试连接
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex-1 overflow-y-auto pr-1 md:mt-5">
            {messages.map((message) => {
              const isMini = message.role === 'mini'
              return (
                <article
                  key={message.id}
                  className={`mb-2 flex ${isMini ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-sm leading-7 shadow-sm md:max-w-[82%] ${
                      isMini ? 'bg-gray-100 text-slate-900' : 'bg-blue-500 text-white'
                    }`}
                  >
                    <div
                      className={`mb-1 text-xs uppercase tracking-[0.2em] ${
                        isMini ? 'text-slate-500' : 'text-blue-100'
                      }`}
                    >
                      {isMini ? 'Mini' : 'You'}
                    </div>
                    <div>{message.content || (isMini && isSending ? 'Mini 正在组织语言…' : '')}</div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/80 p-3 md:mt-5">
            <label htmlFor="chat-input" className="sr-only">
              输入消息
            </label>
            <div className="flex items-end gap-3">
              <textarea
                id="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handleSend()
                  }
                }}
                rows={2}
                placeholder="和 Mini 聊聊天..."
                className="h-12 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || connectionStatus === 'connecting'}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                aria-label={isSending ? '发送中' : '发送'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-500">
                Enter 发送，Shift + Enter 换行{isSending ? ' · 正在等待回复' : ''}
              </p>
              <span className="text-xs text-slate-500">{isSending ? '发送中…' : '准备发送'}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

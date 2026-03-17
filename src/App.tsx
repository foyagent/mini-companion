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

const statusStyles: Record<ConnectionStatus, string> = {
  connecting: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  connected: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  disconnected: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
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
      { label: '模型状态', value: 'Shizuku 在线' },
      { label: '连接状态', value: statusLabels[connectionStatus] },
      { label: 'TTS 状态', value: isVolcTtsConfigured() ? '火山已配置' : '待配置' },
    ],
    [connectionStatus],
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
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10 md:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-8">
            <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-200">
              Mini Companion · MVP
            </div>
            <div className="mt-5 space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                会动的 Mini，开始长脑子也开口说话。
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                这版把 OpenClaw 对话和火山 TTS 预埋进来了。现在能走真实消息链路，后面再把动作触发、表情和长期记忆慢慢接齐。
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
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-lg font-semibold">聊天面板</div>
              <div className="text-sm text-slate-400">OpenClaw 流式回复 + 可选火山 TTS 播放</div>
            </div>
            <div
              className={`rounded-full border px-3 py-1 text-xs ${statusStyles[connectionStatus]}`}
            >
              {statusLabels[connectionStatus]}
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
                    <div>{message.content || (isMini && isSending ? 'Mini 正在组织语言…' : '')}</div>
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
                  void handleSend()
                }
              }}
              rows={4}
              placeholder="比如：Mini，今天给我总结一下待办。"
              className="w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-500">
                Enter 发送，Shift + Enter 换行{isSending ? ' · 正在等待回复' : ''}
              </p>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || connectionStatus === 'connecting'}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isSending ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

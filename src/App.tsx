import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import heroImage from './assets/hero.png'
import ChatInput from './components/ChatInput'
import MessageList from './components/MessageList'
import QuickReplies from './components/QuickReplies'
import StatusBar from './components/StatusBar'
import { useMessages } from './hooks/useMessages'
import { useWebSocket } from './hooks/useWebSocket'
import { speakText, isVolcTtsConfigured } from './services/tts'
import { openClawWebSocket } from './services/websocket'
import type { ChatMessage, ConnectionStatus, StatusItem, ToastState, ToastTone } from './types'

const Live2DCanvas = lazy(() => import('./components/Live2DCanvas'))

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'mini',
    content: '早上好，老板。我现在能试着连 OpenClaw 了，接上就不只是回声机。',
    timestamp: Date.now(),
  },
]

const quickReplies = ['帮我总结今天重点', '讲个冷笑话', '检查 OpenClaw 连接状态']

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
  const { messages, appendMessages, updateMessage } = useMessages(starterMessages)
  const [input, setInput] = useState('')
  const [ttsWarning, setTtsWarning] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, tone: ToastTone = 'error') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }

    setToast({ id: Date.now(), message, tone })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  const { connectionStatus, connectionError, setConnectionError, retryConnection } = useWebSocket(
    showToast,
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const ttsConfigured = useMemo(() => isVolcTtsConfigured(), [])

  const stats = useMemo<StatusItem[]>(
    () => [
      {
        label: '模型状态',
        value: isModelLoading ? '加载中' : 'Shizuku 在线',
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
        value: ttsConfigured ? '火山已配置' : '待配置',
        icon: '🔊',
        mobileHidden: true,
      },
    ],
    [connectionStatus, isModelLoading, ttsConfigured],
  )

  const handleModelLoadStart = useCallback(() => {
    setIsModelLoading(true)
  }, [])

  const handleModelLoadComplete = useCallback(() => {
    setIsModelLoading(false)
  }, [])

  const handleModelLoadError = useCallback(
    (message: string) => {
      setIsModelLoading(false)
      showToast(message)
    },
    [showToast],
  )

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  const updateAssistantMessage = useCallback(
    (assistantMessageId: number, content: string) => {
      updateMessage(assistantMessageId, (message) => ({ ...message, content }))
    },
    [updateMessage],
  )

  const handleSendText = useCallback(
    async (value: string) => {
      const text = value.trim()
      if (!text || isSending) return

      const now = Date.now()
      const userMessage: ChatMessage = {
        id: now,
        role: 'user',
        content: text,
        timestamp: now,
      }

      const assistantMessageId = now + 1
      const assistantPlaceholder: ChatMessage = {
        id: assistantMessageId,
        role: 'mini',
        content: '',
        timestamp: now,
      }

      appendMessages([userMessage, assistantPlaceholder])
      setInput('')
      setConnectionError('')
      setTtsWarning('')
      setIsSending(true)

      try {
        await openClawWebSocket.sendMessage(text, {
          onChunk: (_, fullText) => {
            updateAssistantMessage(assistantMessageId, fullText)
          },
          onDone: async (fullText) => {
            const finalText = fullText.trim() || '……Mini 这次好像想了很多，但没说出来。'
            updateAssistantMessage(assistantMessageId, finalText)

            if (ttsConfigured) {
              try {
                await speakText(finalText)
              } catch {
                setTtsWarning('TTS 播放失败')
                showToast('TTS 播放失败')
              }
            }

            setIsSending(false)
          },
          onError: (error) => {
            const friendlyMessage = `连接出了点小岔子：${error.message}`
            updateAssistantMessage(assistantMessageId, friendlyMessage)
            setConnectionError('消息没发成功，先检查一下连接状态，然后再试一次。')
            showToast(error.message)
            setIsSending(false)
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '发送失败。'
        updateAssistantMessage(assistantMessageId, `发送失败：${message}`)
        setConnectionError('这一条没有送出去，点重试或稍后再发一次。')
        showToast(message)
        setIsSending(false)
      }
    },
    [appendMessages, isSending, setConnectionError, showToast, ttsConfigured, updateAssistantMessage],
  )

  const handleSend = useCallback(async () => {
    await handleSendText(input)
  }, [handleSendText, input])

  const handleQuickReply = useCallback(
    (reply: string) => {
      setInput(reply)
      void handleSendText(reply)
    },
    [handleSendText],
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none fixed right-4 top-4 z-50 md:right-6 md:top-6">
        {toast ? (
          <div
            key={toast.id}
            className={`min-w-[240px] rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur animate-fade-in ${
              toast.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-cyan-200 bg-cyan-50 text-cyan-900'
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </div>

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
                  className={`${item.mobileHidden ? 'hidden lg:block' : 'block'} rounded-xl bg-white p-4 shadow-md`}
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

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <img
                src={heroImage}
                alt="Mini Companion 预览图"
                loading="lazy"
                decoding="async"
                className="h-40 w-full object-cover opacity-80"
              />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
            {isModelLoading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/45 backdrop-blur-sm">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                <p className="text-sm font-medium text-slate-600">模型加载中...</p>
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
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center rounded-[32px] border border-cyan-400/20 bg-slate-950/70 text-sm text-slate-300 shadow-2xl shadow-cyan-950/20">
                    正在按需加载 Live2D 组件...
                  </div>
                }
              >
                <Live2DCanvas
                  onLoadStart={handleModelLoadStart}
                  onLoadComplete={handleModelLoadComplete}
                  onLoadError={handleModelLoadError}
                />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="order-2 flex min-h-[48vh] flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur md:p-5 lg:min-h-[780px] lg:p-6">
          <StatusBar
            connectionStatus={connectionStatus}
            statusLabel={statusLabels[connectionStatus]}
            statusDotClassName={statusDotStyles[connectionStatus]}
          />

          {connectionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-red-800">连接出了点问题</div>
                  <div className="mt-1">{connectionError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void retryConnection()}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500"
                >
                  重试连接
                </button>
              </div>
            </div>
          ) : null}

          <MessageList messages={messages} isSending={isSending} />
          <QuickReplies disabled={isSending} replies={quickReplies} onSelect={handleQuickReply} />
          <ChatInput
            input={input}
            isSending={isSending}
            isConnecting={connectionStatus === 'connecting'}
            ttsWarning={ttsWarning}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onKeyDown={handleInputKeyDown}
          />
        </section>
      </div>
    </main>
  )
}

export default App

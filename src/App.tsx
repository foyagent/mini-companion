import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Live2DCanvas from './components/Live2DCanvas'
import { openClawWebSocket } from './services/websocket'
import { isVolcTtsConfigured, speakText } from './services/tts'
import type { ChatMessage, ConnectionStatus } from './types'
import { chatStorage } from './utils/storage'

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'mini',
    content: '早上好，老板。我现在能试着连 OpenClaw 了，接上就不只是回声机。',
    timestamp: Date.now(),
    status: 'sent',
  },
]

const QUICK_REPLIES = ['你好', '今天天气怎么样', '帮我总结一下待办', '讲个笑话']
const EMOJIS = ['😊', '😂', '🤔', '👍', '❤️']
const TYPING_INTERVAL_MS = 40
const RECONNECT_SECONDS = 5

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

type ToastTone = 'error' | 'info'

interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

interface StreamingState {
  fullText: string
  visibleLength: number
  skipRequested: boolean
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storedMessages = chatStorage.load()
    return storedMessages.length ? storedMessages : starterMessages
  })
  const [input, setInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [connectionError, setConnectionError] = useState('')
  const [ttsWarning, setTtsWarning] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null)
  const [isOffline, setIsOffline] = useState(() => !window.navigator.onLine)
  const toastTimerRef = useRef<number | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const streamingTimersRef = useRef<Map<number, number>>(new Map())
  const streamingStatesRef = useRef<Map<number, StreamingState>>(new Map())

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

  useEffect(() => {
    chatStorage.save(messages)
  }, [messages])

  const clearStreamingTimer = useCallback((messageId: number) => {
    const timer = streamingTimersRef.current.get(messageId)
    if (timer) {
      window.clearTimeout(timer)
      streamingTimersRef.current.delete(messageId)
    }
  }, [])

  const flushTypingAnimation = useCallback(
    (messageId: number) => {
      const streamingState = streamingStatesRef.current.get(messageId)
      if (!streamingState) {
        return
      }

      clearStreamingTimer(messageId)
      streamingStatesRef.current.delete(messageId)

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: streamingState.fullText,
                status: message.status === 'failed' ? 'failed' : 'sent',
              }
            : message,
        ),
      )
    },
    [clearStreamingTimer],
  )

  const updateStreamingMessage = useCallback(
    (messageId: number, fullText: string, done = false) => {
      const currentState = streamingStatesRef.current.get(messageId) ?? {
        fullText: '',
        visibleLength: 0,
        skipRequested: false,
      }

      currentState.fullText = fullText
      streamingStatesRef.current.set(messageId, currentState)

      const applyFrame = () => {
        const state = streamingStatesRef.current.get(messageId)
        if (!state) {
          return
        }

        const shouldFlush = done || state.skipRequested
        if (shouldFlush) {
          flushTypingAnimation(messageId)
          return
        }

        const nextVisibleLength = Math.min(state.visibleLength + 1, state.fullText.length)
        state.visibleLength = nextVisibleLength

        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  content: state.fullText.slice(0, nextVisibleLength),
                  status: nextVisibleLength >= state.fullText.length && done ? 'sent' : 'streaming',
                }
              : message,
          ),
        )

        if (nextVisibleLength >= state.fullText.length) {
          if (done) {
            flushTypingAnimation(messageId)
          } else {
            clearStreamingTimer(messageId)
          }
          return
        }

        const timer = window.setTimeout(applyFrame, TYPING_INTERVAL_MS)
        streamingTimersRef.current.set(messageId, timer)
      }

      if (currentState.skipRequested) {
        flushTypingAnimation(messageId)
        return
      }

      if (!streamingTimersRef.current.has(messageId)) {
        const timer = window.setTimeout(applyFrame, TYPING_INTERVAL_MS)
        streamingTimersRef.current.set(messageId, timer)
      }
    },
    [clearStreamingTimer, flushTypingAnimation],
  )

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current || isSending) {
      return
    }

    setReconnectCountdown(RECONNECT_SECONDS)
    reconnectTimerRef.current = window.setInterval(() => {
      setReconnectCountdown((current) => {
        if (current === null) {
          return null
        }

        if (current <= 1) {
          if (reconnectTimerRef.current) {
            window.clearInterval(reconnectTimerRef.current)
            reconnectTimerRef.current = null
          }

          void openClawWebSocket.connect().catch(() => undefined)
          return null
        }

        return current - 1
      })
    }, 1000)
  }, [isSending])

  const clearReconnectSchedule = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    setReconnectCountdown(null)
  }, [])

  useEffect(() => {
    const streamingTimers = streamingTimersRef.current
    const streamingStates = streamingStatesRef.current

    const unsubscribeStatus = openClawWebSocket.subscribeStatus((status) => {
      setConnectionStatus(status)

      if (status === 'connected') {
        setConnectionError('')
        clearReconnectSchedule()
      }

      if (status === 'error' || status === 'disconnected') {
        scheduleReconnect()
      }
    })

    const unsubscribeError = openClawWebSocket.subscribeError((message) => {
      const friendlyMessage = message.includes('OpenClaw 服务')
        ? '还没连上 OpenClaw。先确认服务已经启动，再点一次重试。'
        : message

      setConnectionError(friendlyMessage)
      showToast(friendlyMessage)
    })

    void openClawWebSocket.connect().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '连接 OpenClaw 失败。'
      const friendlyMessage = `连接没有成功：${message}`
      setConnectionError(friendlyMessage)
      showToast(friendlyMessage)
      scheduleReconnect()
    })

    const handleOffline = () => {
      setIsOffline(true)
      setConnectionError('网络断开了，Mini 正在等你把网接回来。')
      showToast('网络断开，稍后会自动重连。')
      scheduleReconnect()
    }

    const handleOnline = () => {
      setIsOffline(false)
      showToast('网络恢复，重新试着连 Mini。', 'info')
      clearReconnectSchedule()
      void openClawWebSocket.connect().catch(() => {
        scheduleReconnect()
      })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      unsubscribeStatus()
      unsubscribeError()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      openClawWebSocket.disconnect()
      clearReconnectSchedule()
      streamingTimers.forEach((timer) => window.clearTimeout(timer))
      streamingTimers.clear()
      streamingStates.clear()

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [clearReconnectSchedule, scheduleReconnect, showToast])

  const stats = useMemo(
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
        value: isVolcTtsConfigured() ? '火山已配置' : '待配置',
        icon: '🔊',
        mobileHidden: true,
      },
    ],
    [connectionStatus, isModelLoading],
  )

  const handleRetryConnection = async () => {
    setConnectionError('')
    clearReconnectSchedule()

    try {
      await openClawWebSocket.connect()
      showToast('重新连接成功。', 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : '重连失败。'
      const friendlyMessage = `重试还是没连上：${message}`
      setConnectionError(friendlyMessage)
      showToast(friendlyMessage)
      scheduleReconnect()
    }
  }

  const sendMessage = useCallback(
    async (rawText: string, retryForMessageId?: number) => {
      const text = rawText.trim()
      if (!text || isSending) {
        return
      }

      const now = Date.now()
      const userMessage: ChatMessage = {
        id: retryForMessageId ?? now,
        role: 'user',
        content: text,
        timestamp: now,
        status: 'sent',
      }

      const assistantMessageId = now + 1
      const assistantPlaceholder: ChatMessage = {
        id: assistantMessageId,
        role: 'mini',
        content: '',
        timestamp: now,
        status: 'streaming',
        retryForMessageId: userMessage.id,
      }

      setMessages((current) => {
        const nextMessages = retryForMessageId
          ? current.map((message) =>
              message.id === retryForMessageId && message.role === 'mini'
                ? { ...assistantPlaceholder }
                : message,
            )
          : [...current, userMessage, assistantPlaceholder]

        return nextMessages.slice(-100)
      })

      if (!retryForMessageId) {
        setInput('')
      }
      setConnectionError('')
      setTtsWarning('')
      setIsSending(true)

      try {
        await openClawWebSocket.sendMessage(text, {
          onChunk: (_, fullText) => {
            updateStreamingMessage(assistantMessageId, fullText)
          },
          onDone: async (fullText) => {
            const finalText = fullText.trim() || '……Mini 这次好像想了很多，但没说出来。'
            updateStreamingMessage(assistantMessageId, finalText, true)

            if (isVolcTtsConfigured()) {
              try {
                await speakText(finalText)
              } catch {
                setTtsWarning('TTS 播放失败，已自动降级为纯文字显示。')
                showToast('TTS 播放失败，已切回文字。')
              }
            }

            setIsSending(false)
          },
          onError: (error) => {
            clearStreamingTimer(assistantMessageId)
            streamingStatesRef.current.delete(assistantMessageId)
            const friendlyMessage = `连接出了点小岔子：${error.message}`
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: friendlyMessage,
                      status: 'failed',
                      retryForMessageId: userMessage.id,
                    }
                  : message,
              ),
            )
            setConnectionError('消息没发成功，先检查一下连接状态，然后再试一次。')
            showToast(error.message)
            setIsSending(false)
          },
        })
      } catch (error) {
        clearStreamingTimer(assistantMessageId)
        streamingStatesRef.current.delete(assistantMessageId)
        const message = error instanceof Error ? error.message : '发送失败。'
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: `发送失败：${message}`,
                  status: 'failed',
                  retryForMessageId: userMessage.id,
                }
              : item,
          ),
        )
        setConnectionError('这一条没有送出去，点重试或稍后再发一次。')
        showToast(message)
        setIsSending(false)
      }
    },
    [clearStreamingTimer, isSending, showToast, updateStreamingMessage],
  )

  const handleSend = useCallback(async () => {
    await sendMessage(input)
  }, [input, sendMessage])

  const handleRetryMessage = useCallback(
    async (failedMessage: ChatMessage) => {
      if (isSending) {
        return
      }

      const sourceUserMessage = messages.find(
        (message) =>
          message.id === failedMessage.retryForMessageId && message.role === 'user' && message.content,
      )

      if (!sourceUserMessage) {
        showToast('没找到原始问题，这条先手动重发吧。')
        return
      }

      await sendMessage(sourceUserMessage.content, failedMessage.id)
    },
    [isSending, messages, sendMessage, showToast],
  )

  const handleCopyMessage = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content)
        showToast('已复制到剪贴板。', 'info')
      } catch {
        showToast('复制失败，浏览器可能不让。')
      }
    },
    [showToast],
  )

  const handleSkipTyping = useCallback(
    (message: ChatMessage) => {
      const streamingState = streamingStatesRef.current.get(message.id)
      if (!streamingState) {
        return
      }

      streamingState.skipRequested = true
      flushTypingAnimation(message.id)
    },
    [flushTypingAnimation],
  )

  const appendToInput = useCallback((value: string) => {
    setInput((current) => `${current}${value}`)
  }, [])

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
              <Live2DCanvas
                onLoadStart={handleModelLoadStart}
                onLoadComplete={handleModelLoadComplete}
                onLoadError={handleModelLoadError}
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

          {connectionError || isOffline || reconnectCountdown !== null ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-red-800">连接出了点问题</div>
                  <div className="mt-1">
                    {isOffline
                      ? '当前网络已断开，等网络恢复后会继续尝试重连。'
                      : connectionError || 'Mini 正在试着把连接拽回来。'}
                  </div>
                  {reconnectCountdown !== null ? (
                    <div className="mt-1 text-xs text-red-600">{reconnectCountdown} 秒后自动重连…</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRetryConnection()}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500"
                >
                  重试连接
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => void sendMessage(reply)}
                disabled={isSending}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reply}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1 md:mt-5">
            {messages.map((message) => {
              const isMini = message.role === 'mini'
              const isFailed = message.status === 'failed'
              const isStreaming = message.status === 'streaming'

              return (
                <article
                  key={message.id}
                  className={`group mb-2 flex animate-fade-in ${isMini ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="flex max-w-[88%] flex-col gap-2 md:max-w-[82%]">
                    <div
                      className={`relative rounded-2xl p-3 text-sm leading-7 shadow-sm transition ${
                        isMini ? 'bg-gray-100 text-slate-900' : 'bg-blue-500 text-white'
                      } ${isStreaming ? 'cursor-pointer' : ''}`}
                      onClick={() => handleSkipTyping(message)}
                      role={isStreaming ? 'button' : undefined}
                      tabIndex={isStreaming ? 0 : undefined}
                      onKeyDown={(event) => {
                        if (isStreaming && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          handleSkipTyping(message)
                        }
                      }}
                      title={isStreaming ? '点击跳过打字动画' : undefined}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleCopyMessage(message.content)
                        }}
                        className="absolute right-2 top-2 hidden rounded-full border border-black/10 bg-white/80 px-2 py-1 text-[11px] text-slate-700 shadow-sm transition hover:bg-white group-hover:inline-flex"
                      >
                        复制
                      </button>

                      <div
                        className={`mb-1 text-xs uppercase tracking-[0.2em] ${
                          isMini ? 'text-slate-500' : 'text-blue-100'
                        }`}
                      >
                        {isMini ? 'Mini' : 'You'}
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {message.content || (isMini && isSending ? 'Mini 正在组织语言…' : '')}
                      </div>
                      {isStreaming ? (
                        <div className="mt-2 text-[11px] text-slate-500">点击气泡可跳过打字动画</div>
                      ) : null}
                    </div>

                    {isFailed && isMini ? (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-rose-300">这条回复没发利索。</span>
                        <button
                          type="button"
                          onClick={() => void handleRetryMessage(message)}
                          className="rounded-full border border-rose-300/40 bg-rose-400/10 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-400/20"
                        >
                          重试
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/80 p-3 md:mt-5">
            {ttsWarning ? (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 animate-fade-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
                <span>{ttsWarning}</span>
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => appendToInput(emoji)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-base transition hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <label htmlFor="chat-input" className="sr-only">
              输入消息
            </label>
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => showToast('语音功能开发中...', 'info')}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="语音输入（开发中）"
                title="语音功能开发中..."
              >
                🎙️
              </button>
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
                placeholder={isSending ? '发送中...' : '和 Mini 聊聊天...'}
                disabled={isSending}
                className="h-12 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || connectionStatus === 'connecting'}
                className="flex h-12 min-w-24 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                aria-label={isSending ? '发送中' : '发送'}
              >
                {isSending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-slate-400/40 border-t-slate-200 animate-spin" />
                    <span>发送中...</span>
                  </>
                ) : (
                  <>
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
                    <span>发送</span>
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-500">
                Enter 发送，Shift + Enter 换行{isSending ? ' · 正在等待回复' : ''}
              </p>
              <span className="text-xs text-slate-500">
                {isSending ? '发送中...' : reconnectCountdown !== null ? `重连倒计时 ${reconnectCountdown}s` : '准备发送'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

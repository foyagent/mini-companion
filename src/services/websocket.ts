import type { ConnectionStatus } from '../types'

const WS_URL = 'ws://localhost:18789'
const WS_TOKEN = 'a23e42985816ff307c2e29708a2eec5eba1a6f17117ad958'
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000
const RESPONSE_IDLE_TIMEOUT = 1200

interface OpenClawChatRequest {
  type: 'chat'
  content: string
}

interface StreamCallbacks {
  onChunk?: (chunk: string, fullText: string) => void
  onDone?: (fullText: string) => void
  onError?: (error: Error) => void
}

interface PendingStream extends StreamCallbacks {
  buffer: string
  idleTimer: number | null
  settled: boolean
}

interface JsonChunkPayload {
  chunk?: unknown
  content?: unknown
  text?: unknown
  delta?: unknown
  message?: unknown
  done?: unknown
  finished?: unknown
  type?: unknown
  error?: unknown
}

export class OpenClawWebSocketService {
  private socket: WebSocket | null = null
  private status: ConnectionStatus = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private manuallyClosed = false
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private errorListeners = new Set<(error: string) => void>()
  private pendingStream: PendingStream | null = null
  private connectPromise: Promise<void> | null = null

  getStatus() {
    return this.status
  }

  subscribeStatus(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    listener(this.status)

    return () => {
      this.statusListeners.delete(listener)
    }
  }

  subscribeError(listener: (error: string) => void) {
    this.errorListeners.add(listener)

    return () => {
      this.errorListeners.delete(listener)
    }
  }

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.setStatus('connected')
      return
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    this.manuallyClosed = false
    this.clearReconnectTimer()
    this.setStatus('connecting')

    this.connectPromise = new Promise<void>((resolve, reject) => {
      try {
        const url = new URL(WS_URL)
        url.searchParams.set('token', WS_TOKEN)

        const socket = new WebSocket(url)
        this.socket = socket

        socket.onopen = () => {
          this.reconnectAttempts = 0
          this.setStatus('connected')
          this.connectPromise = null
          resolve()
        }

        socket.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        socket.onerror = () => {
          this.emitError('WebSocket 连接出错，请检查 OpenClaw 服务是否已启动。')
        }

        socket.onclose = () => {
          this.socket = null
          this.connectPromise = null
          this.setStatus(this.manuallyClosed ? 'disconnected' : 'error')

          if (!this.manuallyClosed) {
            this.failPendingStream(new Error('与 OpenClaw 的连接已断开。'))
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        this.connectPromise = null
        const normalizedError =
          error instanceof Error ? error : new Error('创建 WebSocket 连接失败。')
        this.setStatus('error')
        this.emitError(normalizedError.message)
        reject(normalizedError)
      }
    })

    return this.connectPromise
  }

  disconnect() {
    this.manuallyClosed = true
    this.clearReconnectTimer()
    this.clearIdleTimer()
    this.pendingStream = null

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.setStatus('disconnected')
  }

  async sendMessage(content: string, callbacks: StreamCallbacks = {}) {
    const text = content.trim()
    if (!text) {
      throw new Error('发送内容不能为空。')
    }

    if (this.pendingStream && !this.pendingStream.settled) {
      throw new Error('上一条消息还没返回完，稍等 Mini 说完。')
    }

    await this.connect()

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 尚未连接成功。')
    }

    this.pendingStream = {
      ...callbacks,
      buffer: '',
      idleTimer: null,
      settled: false,
    }

    const payload: OpenClawChatRequest = {
      type: 'chat',
      content: text,
    }

    this.socket.send(JSON.stringify(payload))
    this.refreshIdleTimer()
  }

  private handleMessage(data: string) {
    if (!this.pendingStream || this.pendingStream.settled) {
      return
    }

    const parsed = this.parseChunk(data)

    if (parsed.error) {
      this.failPendingStream(new Error(parsed.error))
      return
    }

    if (parsed.text) {
      this.pendingStream.buffer += parsed.text
      this.pendingStream.onChunk?.(parsed.text, this.pendingStream.buffer)
    }

    if (parsed.done) {
      this.completePendingStream()
      return
    }

    this.refreshIdleTimer()
  }

  private parseChunk(raw: string): { text: string; done: boolean; error?: string } {
    const trimmed = raw.trim()
    if (!trimmed) {
      return { text: '', done: false }
    }

    try {
      const payload = JSON.parse(trimmed) as JsonChunkPayload
      const error = typeof payload.error === 'string' ? payload.error : undefined
      const done =
        payload.done === true ||
        payload.finished === true ||
        payload.type === 'done' ||
        payload.type === 'end'

      const textCandidate = [payload.chunk, payload.content, payload.text, payload.delta, payload.message].find(
        (item) => typeof item === 'string',
      )

      return {
        text: typeof textCandidate === 'string' ? textCandidate : '',
        done,
        error,
      }
    } catch {
      return { text: raw, done: false }
    }
  }

  private completePendingStream() {
    if (!this.pendingStream || this.pendingStream.settled) {
      return
    }

    const { buffer, onDone } = this.pendingStream
    this.pendingStream.settled = true
    this.clearIdleTimer()
    onDone?.(buffer)
    this.pendingStream = null
  }

  private failPendingStream(error: Error) {
    if (!this.pendingStream || this.pendingStream.settled) {
      this.emitError(error.message)
      return
    }

    const { onError } = this.pendingStream
    this.pendingStream.settled = true
    this.clearIdleTimer()
    onError?.(error)
    this.pendingStream = null
    this.emitError(error.message)
  }

  private refreshIdleTimer() {
    this.clearIdleTimer()

    if (!this.pendingStream) {
      return
    }

    this.pendingStream.idleTimer = window.setTimeout(() => {
      this.completePendingStream()
    }, RESPONSE_IDLE_TIMEOUT)
  }

  private clearIdleTimer() {
    if (this.pendingStream?.idleTimer) {
      window.clearTimeout(this.pendingStream.idleTimer)
      this.pendingStream.idleTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || this.reconnectTimer) {
      return
    }

    const delay = BASE_RECONNECT_DELAY * 2 ** this.reconnectAttempts
    this.reconnectAttempts += 1
    this.emitError(`连接已断开，${Math.round(delay / 1000)} 秒后尝试重连…`)

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      void this.connect().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '重连失败。'
        this.emitError(message)
      })
    }, delay)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.statusListeners.forEach((listener) => listener(status))
  }

  private emitError(message: string) {
    this.errorListeners.forEach((listener) => listener(message))
  }
}

export const openClawWebSocket = new OpenClawWebSocketService()

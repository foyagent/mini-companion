import type { ChatMessage } from '../types'

const STORAGE_KEY = 'mini-companion:messages'
const MAX_MESSAGES = 100
const MAX_STORAGE_BYTES = 180_000

interface StoredMessagesPayload {
  version: 1
  messages: ChatMessage[]
}

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const message = value as Partial<ChatMessage>
  return (
    typeof message.id === 'number' &&
    (message.role === 'mini' || message.role === 'user') &&
    typeof message.content === 'string'
  )
}

const normalizeMessages = (messages: ChatMessage[]) =>
  messages
    .filter(isChatMessage)
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      ...message,
      status:
        message.status === 'failed' || message.status === 'streaming'
          ? 'sent'
          : message.status ?? 'sent',
      retryForMessageId:
        typeof message.retryForMessageId === 'number' ? message.retryForMessageId : undefined,
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
    }))

export const chatStorage = {
  load(): ChatMessage[] {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw) as Partial<StoredMessagesPayload>
      if (!Array.isArray(parsed.messages)) {
        return []
      }

      return normalizeMessages(parsed.messages)
    } catch {
      return []
    }
  },

  save(messages: ChatMessage[]) {
    if (typeof window === 'undefined') {
      return
    }

    const normalized = normalizeMessages(messages)
    const payload: StoredMessagesPayload = {
      version: 1,
      messages: normalized,
    }

    const serialized = JSON.stringify(payload)
    if (serialized.length > MAX_STORAGE_BYTES) {
      const trimmed = normalized.slice(-Math.max(20, Math.floor(MAX_MESSAGES * 0.6)))
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          messages: trimmed,
        } satisfies StoredMessagesPayload),
      )
      return
    }

    window.localStorage.setItem(STORAGE_KEY, serialized)
  },
}

export { MAX_MESSAGES }

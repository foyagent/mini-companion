import type { KeyboardEventHandler, ReactNode } from 'react'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type MessageRole = 'mini' | 'user'

export type MessageStatus = 'sent' | 'streaming' | 'failed'

export interface ChatMessage {
  id: number
  role: MessageRole
  content: string
  timestamp?: number
  status?: MessageStatus
  retryForMessageId?: number
}

export type ToastTone = 'error' | 'info'

export interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

export interface StatusItem {
  label: string
  value: string
  icon: string
  mobileHidden: boolean
}

export interface Live2DEventHandlers {
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onLoadError?: (message: string) => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
}

export interface ErrorBoundaryState {
  hasError: boolean
}

export interface MessageBubbleProps {
  message: ChatMessage
  isSending: boolean
}

export interface MessageListProps {
  messages: ChatMessage[]
  isSending: boolean
}

export interface QuickRepliesProps {
  disabled?: boolean
  replies: string[]
  onSelect: (reply: string) => void
}

export interface StatusBarProps {
  connectionStatus: ConnectionStatus
  statusLabel: string
  statusDotClassName: string
}

export interface ChatInputProps {
  input: string
  isSending: boolean
  isConnecting: boolean
  ttsWarning?: string
  onInputChange: (value: string) => void
  onSend: () => void | Promise<void>
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
}

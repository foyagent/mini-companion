export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type MessageRole = 'mini' | 'user'

export interface ChatMessage {
  id: number
  role: MessageRole
  content: string
  timestamp?: number
}

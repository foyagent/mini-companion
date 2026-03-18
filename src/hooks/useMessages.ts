import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ChatMessage } from '../types'

const STORAGE_KEY = 'mini-companion.messages'

export function useMessages(starterMessages: ChatMessage[]) {
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(STORAGE_KEY, starterMessages)

  const appendMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages((current) => [...current, ...nextMessages])
  }, [setMessages])

  const updateMessage = useCallback((messageId: number, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? updater(message) : message)),
    )
  }, [setMessages])

  const resetMessages = useCallback(() => {
    setMessages(starterMessages)
  }, [setMessages, starterMessages])

  return {
    messages,
    setMessages,
    appendMessages,
    updateMessage,
    resetMessages,
  }
}

import { memo } from 'react'
import MessageBubble from './MessageBubble'
import type { MessageListProps } from '../types'

function MessageListComponent({ messages, isSending }: MessageListProps) {
  return (
    <div className="mt-4 flex-1 overflow-y-auto pr-1 md:mt-5">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} isSending={isSending} />
      ))}
    </div>
  )
}

export const MessageList = memo(MessageListComponent)

export default MessageList

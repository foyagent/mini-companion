import { memo } from 'react'
import type { MessageBubbleProps } from '../types'

function MessageBubbleComponent({ message, isSending }: MessageBubbleProps) {
  const isMini = message.role === 'mini'
  const content = message.content || (isMini && isSending ? 'Mini 正在组织语言…' : '')

  return (
    <article className={`mb-2 flex animate-fade-in ${isMini ? 'justify-start' : 'justify-end'}`}>
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
        <div>{content}</div>
      </div>
    </article>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)

export default MessageBubble

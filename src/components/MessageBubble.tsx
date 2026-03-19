import { memo } from 'react'
import type { MessageBubbleProps } from '../types'

function MessageBubbleComponent({ message, isSending }: MessageBubbleProps) {
  const isMini = message.role === 'mini'
  const content = message.content || (isMini && isSending ? 'Mini 正在组织语言…' : '')

  return (
    <article className={`mb-2 flex animate-fade-in ${isMini ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[88%] rounded-2xl border p-3 text-sm leading-7 shadow-[0_14px_28px_rgba(2,6,23,0.18)] md:max-w-[82%] ${
          isMini
            ? 'border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(10,15,30,0.96))] text-slate-100'
            : 'border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,145,178,0.9),rgba(37,99,235,0.92))] text-white'
        }`}
      >
        <div
          className={`mb-1 text-xs uppercase tracking-[0.2em] ${
            isMini ? 'text-slate-400' : 'text-cyan-100/90'
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

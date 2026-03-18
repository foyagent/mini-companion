import { memo } from 'react'
import type { QuickRepliesProps } from '../types'

function QuickRepliesComponent({ disabled, replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(reply)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reply}
        </button>
      ))}
    </div>
  )
}

export const QuickReplies = memo(QuickRepliesComponent)

export default QuickReplies

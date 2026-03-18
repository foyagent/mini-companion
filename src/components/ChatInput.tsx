import { memo } from 'react'
import type { ChatInputProps } from '../types'

function ChatInputComponent({
  input,
  isSending,
  isConnecting,
  ttsWarning,
  onInputChange,
  onSend,
  onKeyDown,
}: ChatInputProps) {
  return (
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

      <label htmlFor="chat-input" className="sr-only">
        输入消息
      </label>
      <div className="flex items-end gap-3">
        <textarea
          id="chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={isSending ? '发送中...' : '和 Mini 聊聊天...'}
          disabled={isSending}
          className="h-12 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={isSending || isConnecting}
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
        <span className="text-xs text-slate-500">{isSending ? '发送中...' : '准备发送'}</span>
      </div>
    </div>
  )
}

export const ChatInput = memo(ChatInputComponent)

export default ChatInput

import { memo } from 'react'
import type { StatusBarProps } from '../types'

function StatusBarComponent({ connectionStatus, statusLabel, statusDotClassName }: StatusBarProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div>
        <div className="text-lg font-semibold">聊天面板</div>
        <div className="text-sm text-slate-400">OpenClaw 流式回复 + 可选火山 TTS 播放</div>
      </div>
      <div
        className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 md:inline-flex"
        title={statusLabel}
        aria-label={statusLabel}
        data-status={connectionStatus}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassName}`} aria-hidden="true" />
      </div>
    </div>
  )
}

export const StatusBar = memo(StatusBarComponent)

export default StatusBar

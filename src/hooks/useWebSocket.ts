import { useCallback, useEffect, useState } from 'react'
import { openClawWebSocket } from '../services/websocket'
import type { ConnectionStatus } from '../types'

export function useWebSocket(onToast: (message: string) => void) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [connectionError, setConnectionError] = useState('')

  useEffect(() => {
    const unsubscribeStatus = openClawWebSocket.subscribeStatus((status) => {
      setConnectionStatus(status)

      if (status === 'connected') {
        setConnectionError('')
      }
    })

    const unsubscribeError = openClawWebSocket.subscribeError((message) => {
      const friendlyMessage = message.includes('OpenClaw 服务')
        ? '还没连上 OpenClaw。先确认服务已经启动，再点一次重试。'
        : message

      setConnectionError(friendlyMessage)
      onToast(friendlyMessage)
    })

    void openClawWebSocket.connect().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '连接 OpenClaw 失败。'
      const friendlyMessage = `连接没有成功：${message}`
      setConnectionError(friendlyMessage)
      onToast(friendlyMessage)
    })

    return () => {
      unsubscribeStatus()
      unsubscribeError()
      openClawWebSocket.disconnect()
    }
  }, [onToast])

  const retryConnection = useCallback(async () => {
    setConnectionError('')

    try {
      await openClawWebSocket.connect()
      onToast('重新连接成功。')
    } catch (error) {
      const message = error instanceof Error ? error.message : '重连失败。'
      const friendlyMessage = `重试还是没连上：${message}`
      setConnectionError(friendlyMessage)
      onToast(friendlyMessage)
    }
  }, [onToast])

  return {
    connectionStatus,
    connectionError,
    setConnectionError,
    retryConnection,
  }
}

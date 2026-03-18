import { useCallback, useEffect, useState } from 'react'

const isBrowser = typeof window !== 'undefined'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (!isBrowser) {
      return initialValue
    }

    try {
      const storedValue = window.localStorage.getItem(key)
      return storedValue ? (JSON.parse(storedValue) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (!isBrowser) {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage 不可用时静默降级，不影响聊天主流程。
    }
  }, [key, value])

  const removeValue = useCallback(() => {
    if (isBrowser) {
      window.localStorage.removeItem(key)
    }
    setValue(initialValue)
  }, [initialValue, key])

  return [value, setValue, removeValue] as const
}

const VOLC_TTS_ENDPOINT = 'https://openspeech.bytedance.com/api/v1/tts'

interface TtsResponse {
  data?: string
  message?: string
}

export interface TtsOptions {
  voiceType?: string
  speedRatio?: number
  volumeRatio?: number
  pitchRatio?: number
}

const getEnv = (key: string) => import.meta.env[key as keyof ImportMetaEnv]

const getTtsConfig = () => ({
  appId: getEnv('VITE_VOLC_TTS_APP_ID'),
  accessToken: getEnv('VITE_VOLC_TTS_ACCESS_TOKEN'),
  voiceType: getEnv('VITE_VOLC_TTS_VOICE_TYPE') ?? 'BV001_streaming',
})

export const isVolcTtsConfigured = () => {
  const { appId, accessToken } = getTtsConfig()
  return Boolean(appId && accessToken)
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('音频读取失败。'))
    }
    reader.onerror = () => reject(new Error('音频读取失败。'))
    reader.readAsDataURL(blob)
  })

const playAudio = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const audio = new Audio(src)

    const cleanup = () => {
      audio.onended = null
      audio.onerror = null
    }

    audio.onended = () => {
      cleanup()
      resolve()
    }

    audio.onerror = () => {
      cleanup()
      reject(new Error('音频播放失败，请检查浏览器自动播放权限。'))
    }

    void audio.play().catch((error: unknown) => {
      cleanup()
      reject(
        error instanceof Error
          ? error
          : new Error('音频播放失败，请检查浏览器自动播放权限。'),
      )
    })
  })

export async function speakText(text: string, options: TtsOptions = {}) {
  const content = text.trim()
  if (!content) {
    return
  }

  const { appId, accessToken, voiceType } = getTtsConfig()
  if (!appId || !accessToken) {
    throw new Error(
      '火山 TTS 未配置。请在 .env.local 中设置 VITE_VOLC_TTS_APP_ID 和 VITE_VOLC_TTS_ACCESS_TOKEN。',
    )
  }

  const payload = {
    app: {
      appid: appId,
      token: accessToken,
      cluster: 'volcano_tts',
    },
    user: {
      uid: 'mini-companion',
    },
    audio: {
      voice_type: options.voiceType ?? voiceType,
      encoding: 'mp3',
      speed_ratio: options.speedRatio ?? 1,
      volume_ratio: options.volumeRatio ?? 1,
      pitch_ratio: options.pitchRatio ?? 1,
    },
    request: {
      reqid: crypto.randomUUID(),
      text: content,
      text_type: 'plain',
      operation: 'query',
    },
  }

  const response = await fetch(VOLC_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer;${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`火山 TTS 请求失败（${response.status}）。`)
  }

  const result = (await response.json()) as TtsResponse
  if (!result.data) {
    throw new Error(result.message || '火山 TTS 未返回音频数据。')
  }

  const audioBlob = await fetch(`data:audio/mp3;base64,${result.data}`).then((res) => res.blob())
  const audioUrl = await blobToDataUrl(audioBlob)
  await playAudio(audioUrl)
}

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism2'
import type { Live2DEventHandlers } from '../types'

declare global {
  interface Window {
    PIXI: typeof PIXI
    Live2D?: unknown
  }
}

const SHIZUKU_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'

window.PIXI = PIXI
Live2DModel.registerTicker(PIXI.Ticker)

export function Live2DCanvas({ onLoadStart, onLoadComplete, onLoadError }: Live2DEventHandlers) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState('正在接入 Live2D 模型...')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let destroyed = false
    let model: Live2DModel | null = null
    let loadTimeout: number | undefined

    onLoadStart?.()

    const app = new PIXI.Application({
      width: container.clientWidth || 390,
      height: container.clientHeight || 640,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })

    const canvas = app.view as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.background = 'transparent'
    container.appendChild(canvas)

    const fitModel = () => {
      if (!model) return

      const width = container.clientWidth || 390
      const height = container.clientHeight || 640
      app.renderer.resize(width, height)

      const scale = Math.min(width / model.width, height / model.height)
      model.scale.set(scale * 0.36)
      model.anchor.set(0.5, 0)
      model.position.set(width * 0.72, height * 0.16)
    }

    const fail = (message: string) => {
      if (destroyed) return
      setStatus(message)
      onLoadError?.(message)
    }

    const boot = async () => {
      try {
        if (!window.Live2D) {
          throw new Error('Cubism 2 runtime 未注入。')
        }

        setStatus('正在下载 Shizuku 模型资源...')
        model = await Live2DModel.from(SHIZUKU_MODEL_URL, {
          autoInteract: true,
          autoUpdate: false,
        })

        if (destroyed || !model) return

        app.stage.addChild(model)
        app.ticker.add(() => {
          model?.update(app.ticker.deltaMS)
        })
        fitModel()

        model.interactive = true
        model.buttonMode = true
        model.on('hit', (hitAreas: string[]) => {
          setStatus(hitAreas.length > 0 ? `戳到了 ${hitAreas.join(' / ')}` : 'Mini 收到互动啦')
        })

        loadTimeout = window.setTimeout(() => {
          if (!destroyed) {
            setStatus('Shizuku 已接入主舞台')
          }
        }, 600)

        setStatus('Shizuku 已接入主舞台')
        onLoadComplete?.()
      } catch (error) {
        console.error(error)
        const message = 'Live2D 加载失败，请检查模型资源或运行时脚本。'
        fail(message)
      }
    }

    const resizeObserver = new ResizeObserver(() => fitModel())
    resizeObserver.observe(container)

    void boot()

    return () => {
      destroyed = true
      resizeObserver.disconnect()
      if (loadTimeout) {
        window.clearTimeout(loadTimeout)
      }
      model?.destroy()
      app.destroy(true, true)
    }
  }, [onLoadComplete, onLoadError, onLoadStart])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(251,114,153,0.2),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.44))]" />
      <div className="pointer-events-none absolute left-[6%] top-[14%] h-[28%] w-[54%] rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(17,24,39,0.72))] shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between text-white/70">
          <span className="text-[10px] font-semibold tracking-[0.18em]">GAME FEED</span>
          <span className="text-[10px]">KDA 14 / 3 / 9</span>
        </div>
        <div className="absolute inset-x-4 top-12 h-[2px] bg-gradient-to-r from-[#60a5fa] via-[#f472b6] to-transparent opacity-80" />
        <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2 text-center text-white">
          {[
            ['12.4k', '经济'],
            ['3', '大龙'],
            ['98%', '团战'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/8 px-2 py-2 backdrop-blur">
              <p className="text-[14px] font-black">{value}</p>
              <p className="mt-1 text-[10px] text-white/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute left-[6%] right-[44%] top-[46%] rounded-[18px] border border-white/10 bg-black/22 px-4 py-3 text-white/84 backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">赛事字幕</p>
        <p className="mt-2 text-[15px] font-semibold leading-6">Mini 陪看席：这波龙团一开，节奏点直接回来。</p>
      </div>

      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      <div className="pointer-events-none absolute bottom-[94px] right-[10px] w-[110px] rounded-[18px] border border-white/12 bg-black/26 px-3 py-2 text-white/88 backdrop-blur-md shadow-[0_12px_24px_rgba(2,6,23,0.22)]">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/48">Live2D</p>
        <p className="mt-1 text-[13px] font-semibold">Shizuku</p>
        <p className="mt-1 text-[10px] leading-4 text-white/62">{status}</p>
      </div>
    </div>
  )
}

export default Live2DCanvas

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism2'

declare global {
  interface Window {
    PIXI: typeof PIXI
  }
}

const SHIZUKU_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'

window.PIXI = PIXI

export function Live2DCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState('正在加载 Shizuku 模型...')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let destroyed = false
    let model: Live2DModel | null = null

    const app = new PIXI.Application({
      width: container.clientWidth || 560,
      height: container.clientHeight || 640,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })

    container.appendChild(app.view as HTMLCanvasElement)

    const fitModel = () => {
      if (!model) return

      const width = container.clientWidth || 560
      const height = container.clientHeight || 640
      app.renderer.resize(width, height)

      const scale = Math.min(width / model.width, height / model.height)
      model.scale.set(scale * 0.28)
      model.anchor.set(0.5, 0)
      model.x = width / 2
      model.y = 32
    }

    const boot = async () => {
      try {
        model = await Live2DModel.from(SHIZUKU_MODEL_URL)
        if (destroyed || !model) return

        model.interactive = true
        model.buttonMode = true
        model.on('hit', (hitAreas: string[]) => {
          if (hitAreas.length > 0) {
            setStatus(`戳到了 ${hitAreas.join(' / ')}，Mini 有反应啦。`)
          } else {
            setStatus('Mini 被戳了一下，状态良好。')
          }
        })

        fitModel()
        app.stage.addChild(model)
        setStatus('Shizuku 已上线，模型展示正常。')
      } catch (error) {
        console.error(error)
        setStatus('Live2D 加载失败，请检查运行时脚本或模型地址。')
      }
    }

    const resizeObserver = new ResizeObserver(() => fitModel())
    resizeObserver.observe(container)
    void boot()

    return () => {
      destroyed = true
      resizeObserver.disconnect()
      model?.destroy()
      app.destroy(true, true)
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-cyan-400/20 bg-slate-950/70 shadow-2xl shadow-cyan-950/20">
      <div
        ref={containerRef}
        className="h-[640px] w-full bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,0.98))]"
      />
      <div className="absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-slate-200 backdrop-blur">
        CDN 模型：Shizuku · PixiJS v6 · Live2D Cubism 2
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-slate-200 backdrop-blur">
        {status}
      </div>
    </div>
  )
}

export default Live2DCanvas

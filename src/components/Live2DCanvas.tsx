import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

const DEFAULT_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'

export function Live2DCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const [status, setStatus] = useState('正在加载 Live2D 模型...')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let mounted = true
    const app = new PIXI.Application()
    appRef.current = app

    const boot = async () => {
      try {
        await app.init({
          width: container.clientWidth || 720,
          height: container.clientHeight || 520,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        })

        if (!mounted) return
        container.appendChild(app.canvas)

        const model = await Live2DModel.from(DEFAULT_MODEL_URL)
        if (!mounted) {
          model.destroy()
          return
        }

        const scale = Math.min(
          (container.clientWidth || 720) / model.width,
          (container.clientHeight || 520) / model.height,
        )

        model.scale.set(scale * 0.32)
        model.anchor.set(0.5, 0)
        model.x = (container.clientWidth || 720) / 2
        model.y = 32
        model.eventMode = 'static'
        model.cursor = 'grab'
        model.on('pointerdown', () => setStatus('戳到 Mini 了，模型交互正常。'))

        app.stage.addChild(model)
        setStatus('Live2D 已就绪，可以继续替换为你的专属模型。')

        const resize = () => {
          const width = container.clientWidth || 720
          const height = container.clientHeight || 520
          app.renderer.resize(width, height)
          model.x = width / 2
          model.scale.set(Math.min(width / model.width, height / model.height) * 0.32)
        }

        window.addEventListener('resize', resize)
        ;(app as PIXI.Application & { __cleanup?: () => void }).__cleanup = () => {
          window.removeEventListener('resize', resize)
        }
      } catch (error) {
        console.error(error)
        setStatus('Live2D 加载失败，请检查模型地址或跨域设置。')
      }
    }

    boot()

    return () => {
      mounted = false
      ;(appRef.current as PIXI.Application & { __cleanup?: () => void } | null)?.__cleanup?.()
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30">
      <div
        ref={containerRef}
        className="h-[520px] w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.95))]"
      />
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left text-sm text-slate-200 backdrop-blur">
        {status}
      </div>
    </div>
  )
}

export default Live2DCanvas

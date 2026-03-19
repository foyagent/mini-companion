import { useMemo, useState } from 'react'
import Live2DCanvas from './components/Live2DCanvas'

type ConnectionState = 'connected' | 'connecting' | 'disconnected'
type ModelState = 'idle' | 'loading' | 'ready' | 'error'

type ChatMessage = {
  id: number
  user: string
  text: string
  tone?: 'default' | 'hot'
}

type PromoCard = {
  id: number
  title: string
  subtitle: string
  accent: string
}

const chatMessages: ChatMessage[] = [
  { id: 1, user: '怕我那啥子听懂', text: '出山，这回终于像 B 站直播间了。' },
  { id: 2, user: 'BLG-TheShy', text: '模型终于站上主舞台了，这味儿对了。', tone: 'hot' },
  { id: 3, user: '每己昨弱', text: '顶部信息栏、广告条、弹幕区都齐活。' },
  { id: 4, user: '今晚能翻盘吗', text: '中间这块大画面才是直播间该有的重心。' },
  { id: 5, user: '夜里看比赛的人', text: '底部 APP 打开按钮也补上了，细节到位。' },
]

const promoCards: PromoCard[] = [
  { id: 1, title: 'FIRST STAND', subtitle: '淘汰赛今晚开打', accent: '#3b82f6' },
  { id: 2, title: 'BLG vs T1', subtitle: '19:30 焦点战', accent: '#ec4899' },
  { id: 3, title: 'Mini 陪看', subtitle: '实时互动模式', accent: '#f59e0b' },
]

function App() {
  const [connectionState] = useState<ConnectionState>('connected')
  const [modelState, setModelState] = useState<ModelState>('idle')

  const statusMeta = useMemo(() => {
    if (modelState === 'loading') return { label: '模型载入中', tone: 'warning' as const }
    if (modelState === 'error') return { label: '模型异常', tone: 'danger' as const }

    switch (connectionState) {
      case 'connected':
        return { label: '直播中', tone: 'live' as const }
      case 'connecting':
        return { label: '连线中', tone: 'warning' as const }
      default:
        return { label: '已离线', tone: 'danger' as const }
    }
  }, [connectionState, modelState])

  return (
    <main className="bili-app min-h-screen bg-[#050816] text-slate-100">
      <div
        className="flex min-h-screen w-full flex-col bg-[linear-gradient(180deg,#07101f_0%,#0a1226_42%,#060915_100%)] shadow-[0_0_42px_rgba(2,6,23,0.45)]"
        style={{ maxWidth: 430, margin: '0 auto' }}
      >
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07101d]/92 px-4 pb-3 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd9ec_0%,#ff84bf_48%,#7c3aed_100%)] ring-1 ring-white/10">
              <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full border-2 border-[#07101d] bg-[#fb7299] text-[9px] font-black text-white">
                V
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[15px] font-semibold text-white">哔哩哔哩英雄联盟赛事</p>
                <span className="rounded-full border border-[#fb7299]/25 bg-[#fb7299]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb7cf]">
                  官方
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span>2.29万粉丝</span>
                <span>·</span>
                <span>36171101 观看</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-slate-100 backdrop-blur">
                + 关注
              </button>
              <button className="rounded-full bg-[linear-gradient(135deg,#fb7299,#ec4899)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(251,114,153,0.3)]">
                进入直播间
              </button>
            </div>
          </div>
        </header>

        <section className="px-3 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3">
          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,16,31,0.98),rgba(7,12,24,0.98))] shadow-[0_24px_56px_rgba(2,6,23,0.42)]">
            <div className="border-b border-white/6 bg-[linear-gradient(90deg,rgba(59,130,246,0.16),rgba(236,72,153,0.12),rgba(245,158,11,0.12))] px-4 py-2.5 text-[11px] font-medium text-slate-200/90">
              <div className="marquee-track flex items-center gap-6 whitespace-nowrap">
                <span>2026 FIRST STAND 淘汰赛夜场直播</span>
                <span>Mini 陪看席已接入主舞台镜头</span>
                <span>弹幕区升级为深色实时互动面板</span>
              </div>
            </div>

            <div className="relative aspect-[0.78] overflow-hidden bg-[linear-gradient(180deg,#0f172a_0%,#10192f_36%,#16213c_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(59,130,246,0.28),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(251,114,153,0.22),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%)]" />

              <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 text-white">
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#fb7299] px-2 py-1 text-[10px] font-bold shadow-[0_8px_16px_rgba(251,114,153,0.25)]">
                    <span className="inline-flex h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </div>
                  <p className="mt-2 text-[13px] font-semibold">2026 FIRST STAND · 主舞台陪看</p>
                </div>
                <div className={`live-status live-status--${statusMeta.tone}`}>{statusMeta.label}</div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-[78px] z-[1] flex justify-center px-5">
                <div className="grid w-full max-w-[360px] grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-white/92 backdrop-blur-md">
                  <div className="text-left">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#93c5fd]">BLG</p>
                    <p className="mt-1 text-[24px] font-black leading-none">2</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Round 5</p>
                    <p className="mt-1 text-[12px] font-semibold text-white">25 : 41</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#f9a8d4]">T1</p>
                    <p className="mt-1 text-[24px] font-black leading-none">1</p>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-3 bottom-3 z-10 rounded-[20px] border border-white/12 bg-black/28 p-3 text-white backdrop-blur-md">
                <div className="flex items-center justify-between gap-3 text-[11px] text-white/72">
                  <span>bilibili赛事直播</span>
                  <span>延迟 1.2s</span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">Mini 陪看席已接入主舞台</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/65">
                      保留直播主画面氛围，把 Live2D 放进比赛镜头里，不再是孤零零一块白屏。
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/45">热度</p>
                    <p className="mt-1 text-[16px] font-black text-[#ffd166]">98%</p>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 pt-[110px]">
                <Live2DCanvas
                  onLoadStart={() => setModelState('loading')}
                  onLoadComplete={() => setModelState('ready')}
                  onLoadError={() => setModelState('error')}
                />
              </div>
            </div>

            <section className="border-t border-white/6 bg-[linear-gradient(180deg,#08101f_0%,#091427_100%)] px-3 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {promoCards.map((card) => (
                  <article
                    key={card.id}
                    className="min-w-[120px] flex-1 rounded-2xl border border-white/8 px-3 py-3 text-white shadow-[0_16px_30px_rgba(2,6,23,0.22)]"
                    style={{
                      background: `linear-gradient(135deg, ${card.accent}, rgba(15,23,42,0.88))`,
                    }}
                  >
                    <p className="text-[10px] font-bold tracking-[0.16em] text-white/75">推广位</p>
                    <p className="mt-2 text-[14px] font-semibold leading-4">{card.title}</p>
                    <p className="mt-1 text-[11px] text-white/70">{card.subtitle}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/6 bg-[#08111f] px-4 py-3">
              <p className="text-[12px] font-semibold text-[#fda4af]">
                未成年人请在监护人陪同下观看直播，理性发言，拒绝引战与剧透。
              </p>
            </section>

            <section className="border-t border-white/6 bg-[linear-gradient(180deg,#07111f_0%,#08111b_100%)] px-4 py-3">
              <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(9,14,28,0.96))] p-3 shadow-[0_16px_32px_rgba(2,6,23,0.3)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400">赛事预告</p>
                    <p className="mt-1 text-[15px] font-semibold text-white">19:30 BLG vs T1 · BO5 决胜局</p>
                  </div>
                  <span className="rounded-full border border-[#fb7299]/20 bg-[#fb7299]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffb7cf]">
                    即将开赛
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-5 text-slate-400">
                  解说：米勒 / 管泽元 / Rita · 赛后有 Mini 陪看复盘专场。
                </p>
              </div>
            </section>

            <section className="border-t border-white/6 bg-[linear-gradient(180deg,#050b16_0%,#07101d_100%)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-semibold text-white">实时弹幕区</p>
                  <p className="mt-1 text-[11px] text-slate-400">精选弹幕 · 只保留最像直播间的那种热闹</p>
                </div>
                <span className="rounded-full border border-[#fb7299]/20 bg-[#fb7299]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffb7cf]">327+</span>
              </div>

              <div className="mt-3 space-y-2.5">
                {chatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-row ${message.tone === 'hot' ? 'chat-row--hot' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-semibold text-slate-100">{message.user}</span>
                      <span className="text-slate-500">刚刚</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-slate-200">{message.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="border-t border-white/6 bg-[#060b14] p-4">
              <button className="w-full rounded-full bg-[linear-gradient(135deg,#fb7299,#ec4899)] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(251,114,153,0.28)]">
                bilibili APP内打开
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

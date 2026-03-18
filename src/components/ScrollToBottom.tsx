interface ScrollToBottomProps {
  visible: boolean
  onClick: () => void
}

function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="滚动到最新消息"
      className={[
        'pointer-events-auto absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full',
        'border border-white/50 bg-white/80 text-slate-700 shadow-lg shadow-slate-900/15 backdrop-blur-md',
        'transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl hover:shadow-cyan-900/20',
        'active:scale-95',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
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
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}

export default ScrollToBottom

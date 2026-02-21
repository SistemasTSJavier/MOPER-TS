export function Header() {
  return (
    <header className="border-b-2 border-oxford-300 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <span className="text-xl font-bold text-black tracking-wide">TACTICAL</span>
        <img
          src="/logo.png"
          alt="Logo"
          className="h-12 w-auto object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLElement
            if (fallback) fallback.classList.remove('hidden')
          }}
        />
        <span className="hidden font-bold text-oxford-600 text-lg">[Logo]</span>
        <span className="text-xl font-bold text-black tracking-wide">SUPPORT</span>
      </div>
    </header>
  )
}

import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D1B2A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0D1B2A]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Laundry Shuttle
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Pricing
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            How It Works
          </a>
          <Link href="/login" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Log In
          </Link>
          <a
            href="#contact"
            className="rounded-md bg-[#C9A96E] px-5 py-2 text-sm font-semibold text-[#0D1B2A] transition-colors hover:bg-[#C9A96E]/90"
          >
            Schedule a Demo
          </a>
        </nav>
      </div>
    </header>
  );
}

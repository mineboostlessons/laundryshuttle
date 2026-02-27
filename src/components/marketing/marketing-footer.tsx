import Image from "next/image";
import Link from "next/link";

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0D1B2A] px-6 py-16 text-white/80">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Image src="/icons/logo-48.png" alt="" width={32} height={32} className="h-8 w-8" />
              <h3
                className="text-lg font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Laundry Shuttle
              </h3>
            </div>
            <p className="text-sm text-white/60">
              The all-in-one SaaS platform for laundry pickup & delivery businesses.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/login" className="hover:text-white">Log In</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Get Started</h4>
            <a
              href="#contact"
              className="inline-block rounded-md bg-[#C9A96E] px-5 py-2 text-sm font-semibold text-[#0D1B2A] transition-colors hover:bg-[#C9A96E]/90"
            >
              Schedule a Demo
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          &copy; {currentYear} Laundry Shuttle. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

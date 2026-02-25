import { MarketingHeader } from "./marketing-header";
import { MarketingFooter } from "./marketing-footer";

export function MarketingLandingPage() {
  return (
    <>
      {/* Load Clean Luxe fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap"
      />
      <div className="flex min-h-screen flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <MarketingHeader />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden bg-[#0D1B2A] px-6 py-24 sm:py-32 lg:py-40">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A] via-[#1B2D45] to-[#0D1B2A]" />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(201, 169, 110, 0.1) 0%, transparent 50%)" }} />
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-4 py-1.5 text-sm text-[#C9A96E]">
                The #1 Platform for Laundry Businesses
              </div>
              <h1
                className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Launch Your Laundry Pickup &{" "}
                <span className="text-[#C9A96E]">Delivery Business</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
                Everything you need to run a modern laundry business — POS, online ordering,
                driver management, customer websites, and analytics — all in one platform.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="#contact"
                  className="rounded-md bg-[#C9A96E] px-8 py-3 text-base font-semibold text-[#0D1B2A] shadow-lg transition-all hover:bg-[#C9A96E]/90 hover:shadow-xl"
                >
                  Schedule a Demo
                </a>
                <a
                  href="#features"
                  className="rounded-md border border-white/20 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore Features
                </a>
              </div>
            </div>
          </section>

          {/* Social Proof Stats */}
          <section className="border-b border-[#C9A96E]/10 bg-[#F0EDE5] px-6 py-12">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12 text-center">
              {[
                { stat: "500+", label: "Businesses Launched" },
                { stat: "2M+", label: "Orders Processed" },
                { stat: "99.9%", label: "Uptime" },
                { stat: "50+", label: "Cities Served" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-3xl font-bold text-[#0D1B2A]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {item.stat}
                  </p>
                  <p className="mt-1 text-sm text-[#0D1B2A]/60">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="bg-white px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="text-center">
                <h2
                  className="text-3xl font-bold text-[#0D1B2A] sm:text-4xl"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Everything You Need to{" "}
                  <span className="text-[#C9A96E]">Succeed</span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-[#0D1B2A]/60">
                  A complete toolkit built specifically for laundry pickup & delivery operations.
                </p>
              </div>
              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Point of Sale",
                    desc: "Full POS system with Stripe Terminal integration for walk-in customers, retail products, and receipt printing.",
                    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
                  },
                  {
                    title: "Online Ordering",
                    desc: "Customers schedule pickups from your branded website. Mapbox address validation, scheduling, and real-time status updates.",
                    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
                  },
                  {
                    title: "Pickup & Delivery",
                    desc: "Driver management with route optimization, photo capture, digital signatures, and real-time tracking.",
                    icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m0-4.5h-2.25m0 0V3.75m0 0h-2.25",
                  },
                  {
                    title: "Customer Website",
                    desc: "Beautiful branded website for each business with 6 premium themes, CMS page builder, and SEO optimization.",
                    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582",
                  },
                  {
                    title: "Driver Management",
                    desc: "Assign routes, track earnings, manage tips, and optimize multi-stop delivery runs with Mapbox routing.",
                    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
                  },
                  {
                    title: "Analytics & Reports",
                    desc: "Revenue dashboards, customer insights, order trends, benchmarking, and 1099-K tax report generation.",
                    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl border border-[#0D1B2A]/5 bg-[#F0EDE5]/30 p-8 transition-all hover:border-[#C9A96E]/30 hover:shadow-lg"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D1B2A]">
                      <svg className="h-6 w-6 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[#0D1B2A]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#0D1B2A]/60">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="bg-[#F0EDE5] px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <h2
                  className="text-3xl font-bold text-[#0D1B2A] sm:text-4xl"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Get Started in <span className="text-[#C9A96E]">3 Steps</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-[#0D1B2A]/60">
                  From sign-up to your first pickup in under a week.
                </p>
              </div>
              <div className="mt-16 grid gap-10 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Sign Up & Onboard",
                    desc: "Create your account, set up your business profile, connect Stripe, and configure your services and pricing.",
                  },
                  {
                    step: "02",
                    title: "Customize & Brand",
                    desc: "Choose a premium theme, upload your logo, build CMS pages, and set up your service areas with Mapbox.",
                  },
                  {
                    step: "03",
                    title: "Launch & Grow",
                    desc: "Go live with your branded website, start accepting orders, assign drivers, and watch your business scale.",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D1B2A]">
                      <span
                        className="text-lg font-bold text-[#C9A96E]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#0D1B2A]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#0D1B2A]/60">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="bg-white px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2
                className="text-3xl font-bold text-[#0D1B2A] sm:text-4xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Simple, <span className="text-[#C9A96E]">Transparent</span> Pricing
              </h2>
              <p className="mt-4 text-lg text-[#0D1B2A]/60">
                Everything you need to run your laundry business online.
              </p>

              <div className="mt-12 rounded-2xl border border-[#C9A96E]/20 bg-[#F0EDE5]/50 p-10 shadow-lg">
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium uppercase tracking-wider text-[#C9A96E]">All-Inclusive Plan</p>
                  <p className="mt-4 text-lg text-[#0D1B2A]/70">
                    Contact us for pricing details
                  </p>
                </div>

                <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                  {[
                    "Branded customer website",
                    "Full POS system",
                    "Online ordering & scheduling",
                    "Driver management & routing",
                    "Stripe payment processing",
                    "SMS & email notifications",
                    "Analytics dashboard",
                    "CMS page builder",
                    "6 premium themes",
                    "Custom domain support",
                    "Customer review system",
                    "Promo codes & campaigns",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-[#0D1B2A]/80">
                      <svg className="h-4 w-4 flex-shrink-0 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>

                <a
                  href="#contact"
                  className="mt-10 inline-block rounded-md bg-[#0D1B2A] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0D1B2A]/90"
                >
                  Get Started
                </a>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="bg-[#F0EDE5] px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <h2
                className="text-center text-3xl font-bold text-[#0D1B2A] sm:text-4xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Trusted by <span className="text-[#C9A96E]">Laundry Owners</span>
              </h2>
              <div className="mt-12 grid gap-8 sm:grid-cols-3">
                {[
                  {
                    name: "Sarah M.",
                    biz: "Fresh Fold NYC",
                    text: "Laundry Shuttle transformed our business. We went from pen-and-paper to a fully automated pickup & delivery operation in just one week.",
                  },
                  {
                    name: "James R.",
                    biz: "SpinCycle Chicago",
                    text: "The POS system and online ordering work seamlessly together. Our walk-in and delivery customers are all on one platform now.",
                  },
                  {
                    name: "Maria L.",
                    biz: "CleanPress Austin",
                    text: "The driver management and route optimization saved us hours every day. Our delivery efficiency improved by 40% in the first month.",
                  },
                ].map((testimonial) => (
                  <div key={testimonial.name} className="rounded-xl border border-[#0D1B2A]/5 bg-white p-8">
                    <div className="mb-4 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="h-4 w-4 text-[#C9A96E]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm leading-6 text-[#0D1B2A]/70">&ldquo;{testimonial.text}&rdquo;</p>
                    <div className="mt-4 border-t border-[#0D1B2A]/5 pt-4">
                      <p className="text-sm font-semibold text-[#0D1B2A]">{testimonial.name}</p>
                      <p className="text-xs text-[#0D1B2A]/50">{testimonial.biz}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact / Schedule Demo */}
          <section id="contact" className="bg-[#0D1B2A] px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className="text-3xl font-bold text-white sm:text-4xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Ready to <span className="text-[#C9A96E]">Get Started?</span>
              </h2>
              <p className="mt-4 text-lg text-white/60">
                Schedule a free demo and see how Laundry Shuttle can transform your business.
              </p>
              <div className="mt-10 rounded-xl bg-white/5 p-8 backdrop-blur">
                <form className="space-y-4" action="#" method="POST">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#C9A96E] focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#C9A96E] focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Business Name"
                      className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#C9A96E] focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#C9A96E] focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#C9A96E] py-3 text-base font-semibold text-[#0D1B2A] transition-colors hover:bg-[#C9A96E]/90"
                  >
                    Schedule a Demo
                  </button>
                </form>
              </div>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}

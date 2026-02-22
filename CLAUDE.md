# CLAUDE.md — Laundry Shuttle SaaS Platform

## Project Overview

Laundry Shuttle is a **multi-tenant SaaS platform** for laundry pickup & delivery businesses with integrated POS (Point of Sale). Each tenant (laundromat/laundry business) gets their own branded subdomain, customer-facing website, ordering system, driver management, and walk-in POS — all powered by a single shared codebase.

**Revenue model:** $2,000 setup + $99/mo + 1% platform fee on every transaction.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components, Server Actions)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL on Neon (serverless, connection pooling)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js v5 (Google + Facebook OAuth, email/password)
- **Payments:** Stripe Connect (destination charges) + Stripe Terminal (POS) + Stripe Billing (subscriptions) + Stripe Invoicing (B2B/commercial)
- **Maps:** Mapbox (geocoding, autocomplete, route optimization)
- **SMS:** Telnyx (outbound + inbound two-way)
- **Email:** Amazon SES
- **Push Notifications:** Firebase FCM
- **File Storage:** Cloudflare R2 (S3-compatible)
- **Error Monitoring:** Sentry
- **Hosting:** Vercel (Pro plan)

---

## Project Structure

```
laundry-shuttle/
├── CLAUDE.md                    # This file — project guide
├── .env.example                 # Environment variable template
├── .env.local                   # Local env vars (gitignored)
├── next.config.ts               # Next.js configuration
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Seed script (default admin, demo data)
│   └── migrations/
├── public/
│   ├── icons/
│   └── images/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, register, forgot-password)
│   │   ├── (platform)/          # Platform admin dashboard
│   │   │   └── admin/
│   │   ├── (tenant)/            # Tenant-scoped routes
│   │   │   ├── [subdomain]/     # Dynamic tenant routing
│   │   │   │   ├── page.tsx                 # Tenant homepage
│   │   │   │   ├── order/                   # Customer ordering flow
│   │   │   │   ├── dashboard/               # Owner dashboard
│   │   │   │   ├── manager/                 # Manager dashboard
│   │   │   │   ├── attendant/               # Attendant view
│   │   │   │   ├── driver/                  # Driver dashboard
│   │   │   │   ├── pos/                     # POS counter mode
│   │   │   │   ├── customer/                # Customer dashboard
│   │   │   │   └── settings/                # Tenant settings
│   │   ├── api/                 # API routes
│   │   │   ├── auth/            # NextAuth endpoints
│   │   │   ├── webhooks/        # Stripe, Telnyx webhooks
│   │   │   ├── stripe/          # Stripe Connect, Terminal, Billing
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   ├── drivers/
│   │   │   ├── pos/
│   │   │   ├── notifications/
│   │   │   ├── invoices/
│   │   │   └── zapier/          # Outgoing webhooks
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # Shared UI components (buttons, inputs, modals)
│   │   ├── forms/
│   │   ├── dashboard/
│   │   ├── pos/
│   │   ├── maps/
│   │   └── theme/               # Theme system components
│   ├── lib/
│   │   ├── prisma.ts            # Prisma client singleton
│   │   ├── auth.ts              # NextAuth config
│   │   ├── stripe.ts            # Stripe client + helpers
│   │   ├── mapbox.ts            # Mapbox helpers
│   │   ├── telnyx.ts            # Telnyx SMS helpers
│   │   ├── ses.ts               # Amazon SES email helpers
│   │   ├── r2.ts                # Cloudflare R2 upload helpers
│   │   ├── firebase.ts          # FCM push notification helpers
│   │   ├── tenant.ts            # Multi-tenant resolution
│   │   └── utils.ts             # General utilities
│   ├── middleware.ts             # Multi-tenant + auth middleware
│   ├── types/                   # TypeScript type definitions
│   └── hooks/                   # Custom React hooks
└── scripts/
    └── seed.ts                  # Database seeding script
```

---

## Key Architecture Decisions

### Multi-Tenancy
- **Subdomain-based routing:** Each tenant gets `{slug}.laundryshuttle.com`
- **Custom domain support:** Tenants can optionally use their own domain
- **Middleware resolves tenant** from hostname on every request
- **All database queries are tenant-scoped** — never return data from other tenants
- **Shared database** with `tenantId` foreign key on all tenant-owned tables

### Authentication & Roles
- **Platform Admin:** Manages all tenants, billing, platform settings
- **Tenant Owner:** Manages their business, sees all data, revenue dashboards
- **Manager:** Day-to-day operations, staff management, order management
- **Attendant:** Processes orders, operates washer/dryer grid, POS
- **Driver:** Pickup/delivery routes, photo capture, signature
- **Customer:** Places orders, tracks status, manages account

### Payments (Stripe Connect)
- **Platform account** (your Stripe) collects platform fees
- **Connected accounts** (tenant Stripe) receive customer payments
- **Destination charges** for regular orders (1% platform fee auto-deducted)
- **Separate charges** for commercial invoices (ACH + card)
- **Stripe Terminal** for walk-in POS payments
- **Stripe Billing** for customer subscription plans
- **Stripe Invoicing** for B2B/commercial accounts

---

## Coding Standards

- Use TypeScript strict mode — no `any` types
- Use Server Components by default, Client Components only when needed (interactivity, hooks)
- Use Server Actions for form submissions and mutations
- Use Prisma for all database queries — no raw SQL
- Use Zod for input validation on all API routes and Server Actions
- Tailwind CSS for all styling — no CSS modules or styled-components
- Use `shadcn/ui` components as the base UI library
- Consistent error handling: try/catch with proper error responses
- All API routes return typed JSON responses
- Use `next/image` for all images
- Environment variables: prefix client-side with `NEXT_PUBLIC_`

---

## Development Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

---

## Environment Variables

See `.env.example` for all required variables. Copy to `.env.local` and fill in your actual values.

---

## Build Phases

### Phase A: Foundation (Weeks 1–3)
- Week 1: Next.js scaffold, Prisma schema, Neon DB, auth, role-based middleware
- Week 2: Multi-tenant middleware, onboarding wizard, platform admin dashboard
- Week 3: Theme system (4 presets), page builder, tenant website rendering

### Phase B: Customer Experience (Weeks 4–6)
- Week 4: Customer homepage, Mapbox address input, scheduling flow
- Week 5: Customer dashboard, order history, CSV import
- Week 6: Stripe Connect, payments, promo codes, refunds, wallet

### Phase C: Operations + POS (Weeks 7–10)
- Week 7: Owner/Manager/Attendant dashboards
- Week 8: Driver dashboard, route optimization, delivery photos
- Week 9: POS counter mode, Stripe Terminal, retail products
- Week 10: POS payments, tax, notifications (SES + Telnyx + FCM)

### Phase D: Growth & Polish (Weeks 11–14)
- Week 11: Analytics, subscriptions, upsell engine
- Week 12: Reviews, tipping, win-back campaigns, two-way SMS
- Week 13: Commercial invoicing, 1099-K, Zapier webhooks, marketplace
- Week 14: PWA, accessibility, SEO, Launch Kit generator

### Phase E: Launch Prep (Weeks 15–18)
- Week 15: Product tours, sandbox mode, demo tenant
- Week 16: Migration tools, benchmarking, referral program
- Week 17: Integration testing, bug fixes, custom domains
- Week 18: Final QA, deploy to production, go live

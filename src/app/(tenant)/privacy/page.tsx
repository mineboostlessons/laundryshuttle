import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Laundry Shuttle",
  description: "Learn how Laundry Shuttle collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap"
      />
      <div className="flex min-h-screen flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <MarketingHeader />

        <main id="main-content" className="flex-1 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
            <h1
              className="text-4xl font-bold text-[#0D1B2A] sm:text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm text-gray-500">Last updated: February 27, 2026</p>

            <div className="mt-12 space-y-10 text-gray-700 leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">1. Introduction</h2>
                <p className="mt-3">
                  Laundry Shuttle LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Laundry Shuttle platform (&quot;Platform&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform, whether as a business operator (&quot;Tenant&quot;), staff member, driver, or end customer. Please read this policy carefully.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">2. Information We Collect</h2>

                <h3 className="mt-4 font-semibold text-[#0D1B2A]">2.1 Information You Provide</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><strong>Account information:</strong> Name, email address, phone number, password, and profile photo</li>
                  <li><strong>Business information (Tenants):</strong> Business name, address, tax ID, bank account details for payment processing</li>
                  <li><strong>Order information:</strong> Delivery addresses, service preferences, special instructions, and order history</li>
                  <li><strong>Payment information:</strong> Credit/debit card numbers and billing addresses (processed and stored by Stripe; we do not store full card numbers)</li>
                  <li><strong>Communications:</strong> Messages sent via SMS, email, or in-app support</li>
                </ul>

                <h3 className="mt-4 font-semibold text-[#0D1B2A]">2.2 Information Collected Automatically</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><strong>Device information:</strong> IP address, browser type, operating system, and device identifiers</li>
                  <li><strong>Usage data:</strong> Pages visited, features used, click patterns, and session duration</li>
                  <li><strong>Location data:</strong> Geolocation data when you use address autocomplete or when drivers use route optimization (with your permission)</li>
                  <li><strong>Cookies and tracking:</strong> We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage</li>
                </ul>

                <h3 className="mt-4 font-semibold text-[#0D1B2A]">2.3 Information from Third Parties</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><strong>OAuth providers:</strong> When you sign in with Google or Facebook, we receive your name, email, and profile picture</li>
                  <li><strong>Stripe:</strong> Payment confirmation, dispute, and payout information</li>
                  <li><strong>Mapbox:</strong> Geocoded address data and routing information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">3. How We Use Your Information</h2>
                <p className="mt-3">We use the information we collect to:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Provide, operate, and maintain the Platform</li>
                  <li>Process orders, payments, and refunds</li>
                  <li>Create and manage your account</li>
                  <li>Send transactional communications (order confirmations, delivery updates, receipts)</li>
                  <li>Optimize driver routes and delivery schedules</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Generate business analytics and reports for Tenants</li>
                  <li>Detect, prevent, and address fraud, abuse, and security issues</li>
                  <li>Comply with legal obligations, including tax reporting (1099-K)</li>
                  <li>Improve the Platform through usage analysis and feedback</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">4. How We Share Your Information</h2>
                <p className="mt-3">We do not sell your personal information. We may share your information in the following circumstances:</p>
                <ul className="mt-2 list-disc space-y-2 pl-6">
                  <li><strong>With Tenants:</strong> When you place an order through a Tenant&apos;s storefront, your order details, contact information, and delivery address are shared with that Tenant to fulfill your order</li>
                  <li><strong>With Drivers:</strong> Your name, address, and order details are shared with assigned drivers for pickup and delivery</li>
                  <li><strong>Service Providers:</strong> We share data with third-party services that help us operate the Platform:
                    <ul className="mt-1 list-disc space-y-1 pl-6 text-sm">
                      <li>Stripe — payment processing</li>
                      <li>Mapbox — geocoding and route optimization</li>
                      <li>Amazon SES — transactional emails</li>
                      <li>Telnyx — SMS notifications</li>
                      <li>Firebase — push notifications</li>
                      <li>Cloudflare R2 — file storage</li>
                      <li>Sentry — error monitoring</li>
                      <li>Vercel — hosting and infrastructure</li>
                    </ul>
                  </li>
                  <li><strong>Legal Requirements:</strong> When required by law, subpoena, court order, or to protect the rights, property, or safety of the Company, our users, or the public</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">5. Data Retention</h2>
                <p className="mt-3">
                  We retain your personal information for as long as your account is active or as needed to provide services. When an account is deleted or a Tenant subscription is terminated, we retain data for up to 30 days to allow for data export requests, after which it is permanently deleted. Certain data may be retained longer as required by law (e.g., financial records for tax compliance are retained for 7 years).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">6. Data Security</h2>
                <p className="mt-3">
                  We implement industry-standard security measures to protect your information, including:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Encryption in transit (TLS/HTTPS) and at rest</li>
                  <li>Secure password hashing (bcrypt)</li>
                  <li>Role-based access controls ensuring tenant data isolation</li>
                  <li>Regular security monitoring via Sentry</li>
                  <li>Rate limiting on authentication and API endpoints</li>
                  <li>PCI-DSS compliant payment processing through Stripe</li>
                </ul>
                <p className="mt-3">
                  While we take reasonable precautions, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">7. Multi-Tenant Data Isolation</h2>
                <p className="mt-3">
                  The Platform is a multi-tenant system where multiple businesses share the same infrastructure. All data is logically separated by Tenant. Each Tenant can only access data belonging to their own business. The same email address may be used across different Tenants, and each account is treated as separate and independent. Platform administrators do not access Tenant customer data except when necessary for support or legal compliance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">8. Cookies and Tracking Technologies</h2>
                <p className="mt-3">We use the following types of cookies:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><strong>Essential cookies:</strong> Required for authentication, session management, and security (e.g., session tokens, CSRF protection)</li>
                  <li><strong>Functional cookies:</strong> Remember your preferences and settings (e.g., tenant context, theme selection)</li>
                  <li><strong>Analytics cookies:</strong> Help us understand how the Platform is used to improve the experience</li>
                </ul>
                <p className="mt-3">
                  You can control cookies through your browser settings. Disabling essential cookies may prevent you from using certain features of the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">9. Your Rights</h2>
                <p className="mt-3">Depending on your jurisdiction, you may have the following rights:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
                  <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                  <li><strong>Restrict processing:</strong> Request that we limit how we use your data</li>
                </ul>
                <p className="mt-3">
                  To exercise these rights, contact us at <a href="mailto:privacy@laundryshuttle.com" className="text-[#C9A96E] underline hover:text-[#C9A96E]/80">privacy@laundryshuttle.com</a>. We will respond to your request within 30 days.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">10. California Privacy Rights (CCPA)</h2>
                <p className="mt-3">
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt out of the sale of personal information. We do not sell personal information. To make a CCPA request, contact us at <a href="mailto:privacy@laundryshuttle.com" className="text-[#C9A96E] underline hover:text-[#C9A96E]/80">privacy@laundryshuttle.com</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">11. Children&apos;s Privacy</h2>
                <p className="mt-3">
                  The Platform is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">12. International Data Transfers</h2>
                <p className="mt-3">
                  Your information may be transferred to and processed in countries other than your country of residence, including the United States, where our servers and service providers are located. By using the Platform, you consent to the transfer of your information to the United States and other jurisdictions where we operate.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">13. Changes to This Policy</h2>
                <p className="mt-3">
                  We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. For significant changes, we will also notify registered users via email. Your continued use of the Platform after changes take effect constitutes acceptance of the revised policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">14. Contact Us</h2>
                <p className="mt-3">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="mt-2">
                  <strong className="text-[#0D1B2A]">Laundry Shuttle LLC</strong><br />
                  Email: <a href="mailto:privacy@laundryshuttle.com" className="text-[#C9A96E] underline hover:text-[#C9A96E]/80">privacy@laundryshuttle.com</a>
                </p>
              </section>
            </div>
          </div>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}

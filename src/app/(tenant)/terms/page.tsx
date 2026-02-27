import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Terms of Service — Laundry Shuttle",
  description: "Read the Laundry Shuttle terms of service governing use of our platform.",
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-4 text-sm text-gray-500">Last updated: February 27, 2026</p>

            <div className="mt-12 space-y-10 text-gray-700 leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">1. Acceptance of Terms</h2>
                <p className="mt-3">
                  By accessing or using the Laundry Shuttle platform (&quot;Platform&quot;), operated by Laundry Shuttle LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Platform. These Terms apply to all users, including business operators (&quot;Tenants&quot;), their staff, drivers, and end customers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">2. Description of Service</h2>
                <p className="mt-3">
                  Laundry Shuttle is a multi-tenant software-as-a-service (SaaS) platform that provides laundry and dry-cleaning businesses with tools for online ordering, customer management, driver dispatch, point-of-sale operations, payment processing, and business analytics. Each Tenant receives a branded subdomain and access to the Platform&apos;s features under a subscription plan.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">3. Eligibility</h2>
                <p className="mt-3">
                  You must be at least 18 years of age and capable of forming a binding contract to use this Platform. By using the Platform, you represent and warrant that you meet these requirements. If you are using the Platform on behalf of a business, you represent that you have authority to bind that entity to these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">4. Account Registration</h2>
                <p className="mt-3">
                  To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">5. Tenant Obligations</h2>
                <p className="mt-3">
                  Tenants are responsible for their own business operations conducted through the Platform, including compliance with local, state, and federal laws and regulations. Tenants must ensure that their use of the Platform, including pricing, service descriptions, and customer communications, is accurate and lawful. Tenants are solely responsible for managing their staff accounts, customer relationships, and fulfilling orders placed through their storefront.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">6. Fees and Payment</h2>
                <div className="mt-3 space-y-3">
                  <p>
                    Tenants agree to pay the applicable subscription fees as described on our pricing page or as agreed upon during onboarding. Fees include a one-time setup fee, monthly subscription fee, and a platform transaction fee (a percentage of each customer payment processed through the Platform).
                  </p>
                  <p>
                    All fees are non-refundable except as required by applicable law. We reserve the right to modify pricing with 30 days&apos; written notice. Payment processing is handled through Stripe Connect; by using the Platform, you also agree to Stripe&apos;s terms of service.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">7. Customer Payments</h2>
                <p className="mt-3">
                  Customer payments for laundry services are processed through the Tenant&apos;s connected Stripe account. The Company facilitates payment processing but is not a party to the transaction between the Tenant and the customer. Refunds and disputes are the Tenant&apos;s responsibility, though the Platform provides tools to assist with processing them.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">8. Intellectual Property</h2>
                <p className="mt-3">
                  The Platform, including its software, design, text, graphics, logos, and all other content, is owned by or licensed to the Company and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Platform without our prior written consent. Tenants retain ownership of their own business content (logos, product images, customer data) uploaded to the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">9. Acceptable Use</h2>
                <p className="mt-3">You agree not to:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Use the Platform for any unlawful purpose or in violation of any applicable laws</li>
                  <li>Attempt to gain unauthorized access to any part of the Platform or its systems</li>
                  <li>Interfere with or disrupt the Platform&apos;s infrastructure or other users&apos; access</li>
                  <li>Upload malicious code, viruses, or any harmful content</li>
                  <li>Scrape, data mine, or use automated tools to extract data from the Platform</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Use the Platform to send spam or unsolicited communications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">10. Data and Privacy</h2>
                <p className="mt-3">
                  Your use of the Platform is also governed by our <a href="/privacy" className="text-[#C9A96E] underline hover:text-[#C9A96E]/80">Privacy Policy</a>, which describes how we collect, use, and protect personal information. Tenants are data controllers for their customer data and must comply with applicable data protection laws, including providing appropriate privacy notices to their customers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">11. Service Availability</h2>
                <p className="mt-3">
                  We strive to maintain high availability of the Platform but do not guarantee uninterrupted or error-free service. We may perform scheduled maintenance, deploy updates, or experience occasional downtime. We will make reasonable efforts to notify Tenants of planned maintenance in advance. We are not liable for any loss or damage resulting from service interruptions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">12. Termination</h2>
                <div className="mt-3 space-y-3">
                  <p>
                    Either party may terminate the subscription with 30 days&apos; written notice. We may suspend or terminate your access immediately if you violate these Terms, fail to pay fees, or engage in conduct that we determine is harmful to the Platform or other users.
                  </p>
                  <p>
                    Upon termination, Tenants may request an export of their data within 30 days. After this period, we may delete Tenant data in accordance with our data retention policies.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">13. Limitation of Liability</h2>
                <p className="mt-3">
                  To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, revenue, data, or business opportunities, arising from your use of the Platform. Our total cumulative liability shall not exceed the fees paid by you to us in the twelve (12) months preceding the claim.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">14. Disclaimer of Warranties</h2>
                <p className="mt-3">
                  The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Platform will meet your specific requirements or that it will be free from errors or security vulnerabilities.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">15. Indemnification</h2>
                <p className="mt-3">
                  You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">16. Governing Law</h2>
                <p className="mt-3">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">17. Changes to Terms</h2>
                <p className="mt-3">
                  We reserve the right to modify these Terms at any time. We will notify registered users of material changes via email or through the Platform at least 30 days before the changes take effect. Your continued use of the Platform after the effective date of revised Terms constitutes acceptance of those changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#0D1B2A]">18. Contact Us</h2>
                <p className="mt-3">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <p className="mt-2">
                  <strong className="text-[#0D1B2A]">Laundry Shuttle LLC</strong><br />
                  Email: <a href="mailto:legal@laundryshuttle.com" className="text-[#C9A96E] underline hover:text-[#C9A96E]/80">legal@laundryshuttle.com</a>
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

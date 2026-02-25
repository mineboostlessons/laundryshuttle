"use client";

import { FormEvent, useState } from "react";

export function DemoRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, businessName, phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-white/5 p-8 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A96E]/20">
          <svg className="h-7 w-7 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3
          className="text-xl font-semibold text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Thank You!
        </h3>
        <p className="mt-2 text-sm text-white/60">
          We&apos;ll be in touch shortly to schedule your demo.
        </p>
      </div>
    );
  }

  const inputClassName =
    "rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#C9A96E] focus:outline-none focus:ring-1 focus:ring-[#C9A96E]";

  return (
    <div className="rounded-xl bg-white/5 p-8 backdrop-blur">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            name="businessName"
            placeholder="Business Name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClassName}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClassName}
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-md bg-[#C9A96E] py-3 text-base font-semibold text-[#0D1B2A] transition-colors hover:bg-[#C9A96E]/90 disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : "Schedule a Demo"}
        </button>
      </form>
    </div>
  );
}

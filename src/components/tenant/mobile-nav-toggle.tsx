"use client";

import { useState } from "react";
import Link from "next/link";

interface MobileNavToggleProps {
  pages: Array<{ title: string; slug: string }>;
  user?: { name: string; email: string } | null;
}

export function MobileNavToggle({ pages, user }: MobileNavToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="absolute left-0 right-0 top-16 border-b bg-background p-6 shadow-lg">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
            {pages.map((page) => (
              <Link
                key={page.slug}
                href={`/p/${page.slug}`}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {page.title}
              </Link>
            ))}
            <Link
              href="/order"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Order Now
            </Link>

            {user ? (
              <Link
                href="/customer"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="font-medium text-foreground">{user.name}</span>{" "}
                <span className="text-xs">({user.email})</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

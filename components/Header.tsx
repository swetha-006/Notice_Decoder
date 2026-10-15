"useContent";
"use client";

import React from "react";
import { ShieldCheck, Lock } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-canvas-card">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded border border-accent bg-accent text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Notice Check
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              Before you panic or pay, check whether an official-looking notice is real and know exactly what to do.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-md border border-border bg-canvas-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary sm:self-auto">
            <Lock className="h-3.5 w-3.5 text-genuine" aria-hidden="true" />
            <span>Review masked text before sending</span>
          </div>
        </div>
      </div>
    </header>
  );
}

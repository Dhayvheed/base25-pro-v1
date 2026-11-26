"use client";

import SiteNavigation from "@/components/SiteNavigation";

export default function PredictionsPage() {
  return (
    <>
      <SiteNavigation />
      <main className="min-h-screen bg-[#080b0d] px-5 py-20 text-[#f4f5f2]">
        <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center">
          <div className="mb-5 rounded-full border border-[#c7a45a]/30 bg-[#c7a45a]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#d7b96e]">
            BASE25 PRO
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Predictions are coming soon.</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/60 sm:text-base">
            We’re working on something exciting. The Predictions League will be back when it’s ready.
          </p>
          <a href="/" className="mt-8 rounded-xl bg-[#c7a45a] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#dfc17a]">
            Back to BASE25
          </a>
        </div>
      </main>
    </>
  );
}

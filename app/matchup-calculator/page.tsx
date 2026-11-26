"use client";

import SiteNavigation from "@/components/SiteNavigation";
import MatchupCalculator from "@/components/MatchupCalculator";

export default function MatchupCalculatorPage() {
  return (
    <>
      <SiteNavigation />
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c7a45a]">BASE25 PRO</p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Matchup Calculator</h1>
          <p className="mt-2 text-sm text-white/60">Check your odds before you challenge another player.</p>
        </div>
        <MatchupCalculator />
      </main>
    </>
  );
}

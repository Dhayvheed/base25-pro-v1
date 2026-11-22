import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

export default function HowItWorks() {
  return (
    <main className="shell">
      <SiteNavigation />

      <section className="how-hero">
        <div className="eyebrow">THE BASE25 RANKING SYSTEM</div>
        <h1>Understand the points.<br/><span>Earn your rank.</span></h1>
        <p>Every player starts on equal ground. Your match results and performance in each rack determine how your ELO rating changes.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">01 / YOUR STARTING POINT</div>
        <h2>Everyone starts at <span>1,000 ELO.</span></h2>
        <p>When you join BASE25 PRO, your starting rating is 1,000. From there, your rating moves up or down as official ranked matches are recorded.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">02 / MATCH RESULTS</div>
        <h2>Winning matters. <span>Who you beat matters too.</span></h2>
        <p>BASE25 uses an ELO rating system. It considers both players' ratings before the match to calculate the match points.</p>
        <ul>
          <li>Win against a higher-rated player and you generally earn more points.</li>
          <li>Win against a lower-rated player and you generally earn fewer points.</li>
          <li>Lose to a lower-rated player and you generally lose more points.</li>
          <li>Lose to a higher-rated player and you generally lose fewer points.</li>
        </ul>
        <p>In simple terms, the system rewards results that are stronger than the rating system expected.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">03 / RACK BONUSES</div>
        <h2>Every rack <span>counts.</span></h2>
        <p>You can earn bonus points for winning individual racks, even if you lose the overall match.</p>
        <div className="how-example">
          <b>Rack bonus example</b>
          <div><span>You win the rack. Opponent leaves 4 balls.</span><strong>+4 points</strong></div>
          <div><span>You win the rack. Opponent leaves 7 or more balls.</span><strong>+7 points maximum</strong></div>
          <div><span>You win by clearing the black ball.</span><strong>+0 margin bonus</strong></div>
        </div>
        <p>The bonus is based on the number of balls your opponent leaves on the table, capped at 7 points per rack. A black-ball finish does not receive a ball-margin bonus.</p>
        <p>Only the winner of that particular rack receives its bonus. So if you win one rack but lose the match, you still keep the bonus from the rack you won.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">04 / HOW THE TOTAL IS CALCULATED</div>
        <h2>Two parts make up <span>your ELO change.</span></h2>
        <ol>
          <li><b>Match adjustment:</b> points gained or lost from the overall match result, based on both players' ratings.</li>
          <li><b>Rack bonuses:</b> the bonuses you earned from each rack you won.</li>
        </ol>
        <div className="how-example">
          <b>Example: You win a match 2–1</b>
          <div><span>Match adjustment</span><strong>+17</strong></div>
          <div><span>Rack 1 bonus (opponent leaves 3)</span><strong>+3</strong></div>
          <div><span>Rack 3 bonus (opponent leaves 2)</span><strong>+2</strong></div>
          <div className="how-total"><span>Your total ELO change</span><strong>+22</strong></div>
        </div>
        <p>The other player can also earn a rack bonus for the rack they won, even though they lost the match. Rack bonuses are added to each player's own match adjustment.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">05 / EXPERIENCE LEVEL</div>
        <h2>Your first matches carry <span>more weight.</span></h2>
        <p>The system uses a K-factor to control how much the match result can move your rating.</p>
        <div className="how-example">
          <div><span>While either player has fewer than 10 previous matches</span><strong>K = 40</strong></div>
          <div><span>Once both players have at least 10 previous matches</span><strong>K = 24</strong></div>
        </div>
        <p>This lets ratings adjust faster while players are new, then become more stable as both players build match history. The K-factor applies to the match adjustment, not the rack bonuses.</p>
      </section>

      <section className="how-section">
        <div className="eyebrow">06 / THE LEADERBOARD</div>
        <h2>Climb by <span>earning it.</span></h2>
        <ul>
          <li>Players are ordered by current ELO rating, highest first.</li>
          <li>Your position can change whenever a new ranked match is recorded.</li>
          <li>The top three positions receive podium crowns.</li>
          <li>Your player profile shows your match history and rack-by-rack results.</li>
        </ul>
      </section>

      <section className="how-end">
        <h2>Every rack matters.<br/><span>Every point counts.</span></h2>
        <Link className="primary" href="/#leaderboard">View the leaderboard ↗</Link>
      </section>

      <footer><b>BASE25 PRO</b><span>Built for competition. Powered by performance.</span><Link href="/admin">Admin access ↗</Link></footer>
    </main>
  );
}

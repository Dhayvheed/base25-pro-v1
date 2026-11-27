export type KombatMatchType = "ranked" | "casual";
export type KombatMatchFormat = "bo3" | "bo5";
export type KombatWeekStatus = "open" | "final" | "frozen";
export type KombatPotMode = "live" | "fixed" | "soon";

export interface KombatFighter {
  id: string;
  name: string;
  slug: string;
  tile_color: string | null;
  image_src: string | null;
  enabled: boolean;
  sort_order: number;
}

export interface KombatRating {
  player_id: string;
  all_time_elo: number;
  weekly_rating: number;
  ranked_wins: number;
  ranked_losses: number;
  current_streak: number;
}

export interface KombatConfig {
  id: number;
  pot_mode: KombatPotMode;
  fixed_pot_amount: number;
  pot_per_ranked_match: number;
  final_format: KombatMatchFormat;
  qualifying_spots: number;
}

export interface KombatWeek {
  id: string;
  start_at: string;
  end_at: string;
  status: KombatWeekStatus;
}

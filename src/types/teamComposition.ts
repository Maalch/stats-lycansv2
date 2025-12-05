export interface TeamConfiguration {
  wolfCount: number;         // Number of Loup + Traître + Louveteau
  pureWolfCount: number;     // Number of pure "Loup" role
  traitreCount: number;      // Number of Traître
  louveteuCount: number;     // Number of Louveteau
  soloCount: number;         // Number of solo roles
  villageoisCount: number;   // Calculated: playerCount - wolfCount - soloCount
  appearances: number;       // How many times this config appeared
  winsByWolves: number;
  winsByVillageois: number;
  winsBySolo: number;
  wolfWinRate: number;       // (winsByWolves / appearances * 100)
  villageoisWinRate: number; // (winsByVillageois / appearances * 100)
  soloWinRate: number;       // (winsBySolo / appearances * 100)
  configKey: string;         // e.g., "2w-1s" (2 wolves, 1 solo)
  wolfBreakdownKey: string;  // e.g., "2L-1T-0Lou" (2 pure Loups, 1 Traître, 0 Louveteau)
}

export interface CompositionByPlayerCount {
  playerCount: number;       // 8-15
  totalGames: number;
  configurations: TeamConfiguration[];
  mostCommon?: TeamConfiguration;    // Most frequent config (min 5 appearances)
  bestWolfWinRate?: TeamConfiguration;     // Highest wolf win rate (min 5 appearances)
  bestVillageoisWinRate?: TeamConfiguration; // Highest villageois win rate (min 5 appearances)
}

export interface TeamCompositionResponse {
  compositionsByPlayerCount: CompositionByPlayerCount[];
  totalGamesAnalyzed: number;
  configurationsWithMinAppearances: number; // Count of configs appearing >= 5 times
}

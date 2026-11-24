import { describe, expect, it } from 'vitest';
import { processGeneralRankings } from './general-rankings.js';

describe('processGeneralRankings', () => {
  it('applies the dataset-based cutoff and reports the calculated minimum', () => {
    const playerStats = [
      { player: 'below-threshold', gamesPlayed: 19, winPercent: '99.0' },
      { player: 'eligible', gamesPlayed: 20, winPercent: '60.0' }
    ];

    expect(processGeneralRankings(playerStats, 'below-threshold', '', 1000)).toEqual([]);

    const rankings = processGeneralRankings(playerStats, 'eligible', '', 1000);
    const winRateRanking = rankings.find(ranking => ranking.id === 'winrate-10-all');

    expect(winRateRanking.description).toContain('(min. 20 parties)');
  });
});

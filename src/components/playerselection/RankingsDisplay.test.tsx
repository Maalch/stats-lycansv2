import { render, screen } from '@testing-library/react';
import type { Ranking } from '../../types/rankings';
import { RankingsDisplay } from './RankingsDisplay';

vi.mock('../../context/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToTab: () => {},
    updateNavigationState: () => {},
    clearNavigation: () => {}
  })
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { highlightedPlayer: null },
    updateSettings: () => {}
  })
}));

vi.mock('../../hooks/useJoueursData', () => ({
  useJoueursData: () => ({ joueursData: { Players: [] } })
}));

vi.mock('../../types/api', () => ({
  getRandomColor: (playerName: string) => playerName,
  useThemeAdjustedDynamicPlayersColor: () => ({})
}));

describe('RankingsDisplay', () => {
  it('shows calculated game minimums in ranking tooltips', () => {
    const rankings: Ranking[] = [
      {
        id: 'winrate',
        title: 'Taux de victoire',
        description: 'Meilleur taux de victoire (min. 23 parties)',
        type: 'good',
        category: 'general',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'playersGeneral' }
      },
      {
        id: 'map',
        title: 'Village',
        description: 'Meilleur taux de victoire sur Village (min. 23)',
        type: 'good',
        category: 'map',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'playersGeneral', mapFilter: 'village' }
      },
      {
        id: 'kills',
        title: 'Tueur efficace',
        description: 'Meilleur ratio (min. 57 parties)',
        type: 'good',
        category: 'kills',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'deathStats', chartSection: 'killers-average' }
      },
      {
        id: 'performance',
        title: 'Hall of Fame',
        description: 'Meilleur overperformer (min. 57)',
        type: 'good',
        category: 'performance',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'campStats', chartSection: 'hall-of-fame' }
      },
      {
        id: 'comparison',
        title: 'Meilleur coéquipier',
        description: 'Meilleur duo avec Rival: 75% (3/4 parties, min. 38)',
        type: 'good',
        category: 'comparison',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'comparison' }
      },
      {
        id: 'communication',
        title: 'Temps de parole',
        description: 'Joueur le plus bavard (minimum 23 parties avec données)',
        type: 'good',
        category: 'communication',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'talkingTime' }
      },
      {
        id: 'loot',
        title: 'Taux de récolte',
        description: 'Meilleur taux (min. 47 parties)',
        type: 'good',
        category: 'loot',
        rank: 4,
        totalRanked: 10,
        redirectTo: { tab: 'rankings', subTab: 'lootStats' }
      }
    ];

    render(<RankingsDisplay rankings={rankings} title="Classements" />);

    expect(screen.getByTitle(/taux de victoire \(min\. 23 parties\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/Village \(min\. 23 parties\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/moyenne des kills \(min\. 57 parties\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/Hall of Fame \(toutes performances\) \(min\. 57 parties\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/min\. 38 parties ensemble/)).toBeInTheDocument();
    expect(screen.getByTitle(/minimum 23 parties avec données/)).toBeInTheDocument();
    expect(screen.getByTitle(/taux de récolte \(min\. 47 parties\)/)).toBeInTheDocument();
  });
});

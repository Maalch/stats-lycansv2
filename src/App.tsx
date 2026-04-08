import { Suspense, lazy, useState, useEffect } from 'react';
import { FullscreenProvider } from './context/FullscreenContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { SettingsIndicator } from './components/common/SettingsIndicator';
import { SettingsBadge } from './components/common/SettingsBadge';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSkeleton } from './components/common/LoadingSkeleton';
import { mergeUrlState } from './utils/urlManager';
import './App.css';

// Lazy load each dashboard section
const PlayersGeneralStatisticsChart = lazy(() => import('./components/playerstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/playerstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerCampChart = lazy(() => import('./components/playerstats/PlayerCamp/PlayerCampChart').then(m => ({ default: m.PlayerCampChart })));
const PlayerComparisonChart = lazy(() => import('./components/playerstats/PlayerComparisonChart').then(m => ({ default: m.PlayerComparisonChart })));
const PlayerSeriesChart = lazy(() => import('./components/playerstats/PlayerSeriesChart').then(m => ({ default: m.PlayerSeriesChart })));
const TalkingTimeChart = lazy(() => import('./components/playerstats/TalkingTimeChart').then(m => ({ default: m.TalkingTimeChart })));
const LootStatisticsChart = lazy(() => import('./components/playerstats/LootStatisticsChart').then(m => ({ default: m.LootStatisticsChart })));
const RoleActionsRankingChart = lazy(() => import('./components/playerstats/RoleActionsRankingChart').then(m => ({ default: m.RoleActionsRankingChart })));
const PotionScrollStatsChart = lazy(() => import('./components/playerstats/PotionScrollStatsChart').then(m => ({ default: m.PotionScrollStatsChart })));
const MonthlyRankingChart = lazy(() => import('./components/playerstats/MonthlyRanking/MonthlyRankingChart').then(m => ({ default: m.MonthlyRankingChart })));

// Death statistics components
const DeathStatisticsChart = lazy(() => import('./components/playerstats/DeathsAndKills/DeathStatisticsChart').then(m => ({ default: m.DeathStatisticsChart })));

// Voting statistics components
const VotingStatisticsChart = lazy(() => import('./components/playerstats/Voting/VotingStatisticsChart').then(m => ({ default: m.VotingStatisticsChart })));

// Color statistics components
const ColorStatisticsChart = lazy(() => import('./components/generalstats/ColorStatisticsChart').then(m => ({ default: m.ColorStatisticsChart })));
// Player color ranking component
const PlayerColorRankingChart = lazy(() => import('./components/playerstats/PlayerColorRankingChart').then(m => ({ default: m.PlayerColorRankingChart })));

const CampsChart = lazy(() => import('./components/generalstats/CampsChart').then(m => ({ default: m.CampsChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));
const VictoryTypesChart = lazy(() => import('./components/generalstats/VictoryTypesChart').then(m => ({ default: m.VictoryTypesChart })));
const GlobalVotingStatsChart = lazy(() => import('./components/generalstats/GlobalVotingStatsChart').then(m => ({ default: m.GlobalVotingStatsChart })));
const RolesStatsChart = lazy(() => import('./components/generalstats/RolesStatsChart').then(m => ({ default: m.RolesStatsChart })));
const TeamCompositionChart = lazy(() => import('./components/generalstats/TeamCompositionChart').then(m => ({ default: m.TeamCompositionChart })));
const GlobalGameHistoryChart = lazy(() => import('./components/generalstats/GlobalGameHistoryChart').then(m => ({ default: m.GlobalGameHistoryChart })));
const ActionMetaStatsChart = lazy(() => import('./components/generalstats/ActionMetaStatsChart').then(m => ({ default: m.ActionMetaStatsChart })));

const BRParticipationsChart = lazy(() => import('./components/brstats/BRParticipationsChart').then(m => ({ default: m.BRParticipationsChart })));
const BRWinRateChart = lazy(() => import('./components/brstats/BRWinRateChart').then(m => ({ default: m.BRWinRateChart })));
const BRKillsStatsChart = lazy(() => import('./components/brstats/BRKillsStatsChart').then(m => ({ default: m.BRKillsStatsChart })));
const BRMiniChart = lazy(() => import('./components/brstats/BRMiniChart').then(m => ({ default: m.BRMiniChart })));

const DeathLocationHeatmap = lazy(() => import('./components/generalstats/deathStats/DeathLocationHeatmap').then(m => ({ default: m.DeathLocationHeatmap })));
const WhatIfSimulator = lazy(() => import('./components/generalstats/WhatIfSimulator/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));

const GameDetailsChart = lazy(() => import('./components/gamedetails/GameDetailsChart').then(m => ({ default: m.GameDetailsChart })));

// Add settings import
const SettingsPanel = lazy(() => import('./components/settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

// Player selection page
const PlayerSelectionPage = lazy(() => import('./components/playerselection/PlayerSelectionPage').then(m => ({ default: m.PlayerSelectionPage })));

// Clips page
const ClipsPage = lazy(() => import('./components/clips/ClipsPage').then(m => ({ default: m.ClipsPage })));

// Import VersionDisplay component
import { VersionDisplay } from './components/common/VersionDisplay';
import { ChangelogPage } from './components/common/ChangelogPage';
import { PrivacyPolicyPage } from './components/common/PrivacyPolicyPage';

const MAIN_TABS = [
  { 
    key: 'playerSelection', 
    label: 'Joueur', 
    icon: '👤',
    description: 'Choisir un joueur et voir ses succès'
  },
  { 
    key: 'rankings', 
    label: 'Classements', 
    icon: '🏆',
    description: 'Statistiques des joueurs'
  },
  { 
    key: 'general', 
    label: 'Stats Parties', 
    icon: '🎯',
    description: 'Statistiques générales'
  },
  { 
    key: 'gameDetails', 
    label: 'Détails des Parties', 
    icon: '📋',
    description: 'Détails complets de chaque partie'
  },
  { 
    key: 'clips', 
    label: 'Clips', 
    icon: '🎬',
    description: 'Bibliothèque de clips vidéo'
  },
  { 
    key: 'br', 
    label: 'Battle Royale', 
    icon: '⚔️',
    description: 'Statistiques Battle Royale'
  },

  { 
    key: 'settings', 
    label: 'Filtres', 
    icon: '⚙️',
    description: 'Filtres et configuration'
  },
];

const PLAYER_STATS_MENU = [
  { 
    key: 'playersGeneral', 
    label: 'Participations & Victoires', 
    component: PlayersGeneralStatisticsChart,
    description: 'Classement par participations et victoires'
  },
  { 
    key: 'monthlyRanking', 
    label: 'Classements Mensuels', 
    component: MonthlyRankingChart,
    description: 'Classement des joueurs par mois (min. 40% de participation)'
  },

  { 
    key: 'campStats', 
    label: 'Camps & Rôles', 
    component: PlayerCampChart,
    description: 'Meilleures performances et apparitions, par camp'
  },
  { 
    key: 'series', 
    label: 'Séries', 
    component: PlayerSeriesChart,
    description: 'Séries consécutives de camps et de victoires'
  },
  { 
    key: 'pairing', 
    label: 'Paires de Joueurs', 
    component: PlayerPairingStatsChart,
    description: 'Paires de loups et d\'amoureux'
  },
  { 
    key: 'deathStats', 
    label: 'Morts & Kills', 
    component: DeathStatisticsChart,
    description: 'Analyse des morts des joueurs'
  },
  { 
    key: 'votingStats', 
    label: 'Votes', 
    component: VotingStatisticsChart,
    description: 'Comportements et précision de vote des joueurs'
  },
  { 
    key: 'talkingTime', 
    label: 'Temps de Parole', 
    component: TalkingTimeChart,
    description: 'Analyse du temps de parole en et hors meetings'
  },
  { 
    key: 'lootStats', 
    label: 'Récolte', 
    component: LootStatisticsChart,
    description: 'Classement du loot collecté par joueur'
  },
  { 
    key: 'potionScrollStats', 
    label: 'Potions & Parchemins', 
    component: PotionScrollStatsChart,
    description: 'Classement par utilisation de potions et parchemins'
  },
  { 
    key: 'roleActions', 
    label: 'Actions des Rôles', 
    component: RoleActionsRankingChart,
    description: 'Transformations (Loup) et précision (Chasseur)'
  },
  { 
    key: 'colorRanking', 
    label: 'Couleurs', 
    component: PlayerColorRankingChart,
    description: 'Classement des joueurs par couleur'
  },
  { 
    key: 'comparison', 
    label: 'Face à Face', 
    component: PlayerComparisonChart,
    description: 'Comparaison détaillée entre deux joueurs'
  }
];

const GENERAL_STATS_MENU = [
  { 
    key: 'evolution', 
    label: 'Évolution', 
    component: GlobalGameHistoryChart,
    description: 'Évolution des parties au fil du temps'
  },
  { 
    key: 'camps', 
    label: 'Camps', 
    component: CampsChart,
    description: 'Détails des apparitions et victoires par camp'
  },
  { 
    key: 'rolesStats', 
    label: 'Rôles', 
    component: RolesStatsChart,
    description: 'Statistiques générales des rôles et pouvoirs'
  },
  { 
    key: 'actionMeta', 
    label: 'Actions', 
    component: ActionMetaStatsChart,
    description: 'Analyse méta des actions (gadgets, potions, transformations)'
  },
  { 
    key: 'teamComposition',
    label: 'Compositions',
    component: TeamCompositionChart,
    description: 'Analyse des configurations d\'équipe par nombre de joueurs'
  },
  { 
    key: 'whatIf', 
    label: 'Simulateur', 
    component: WhatIfSimulator,
    description: 'Simuler la probabilité de victoire selon la composition d\'équipe'
  },
  { 
    key: 'victoryTypes',
    label: 'Types de Victoire',
    component: VictoryTypesChart,
    description: 'Répartition des types de victoire par camp'
  },
  { 
    key: 'globalVoting', 
    label: 'Votes', 
    component: GlobalVotingStatsChart,
    description: 'Analyse globale des comportements de vote en réunion'
  },
  { 
    key: 'harvest', 
    label: 'Récolte', 
    component: HarvestProgressChart,
    description: 'Détails sur la récolte villageoise'
  },
  { 
    key: 'duration', 
    label: 'Durée', 
    component: GameDurationInsights,
    description: 'Statistiques sur la durée des parties'
  },
  { 
    key: 'heatmap', 
    label: 'Heatmap', 
    component: DeathLocationHeatmap,
    description: 'Carte de chaleur des localisations de mort'
  },
  { 
    key: 'colorStats', 
    label: 'Couleurs', 
    component: ColorStatisticsChart,
    description: 'Taux de victoire et popularité des couleurs'
  }

];

const BR_STATS_MENU = [
  { 
    key: 'brParticipations', 
    label: 'Participations', 
    component: BRParticipationsChart,
    description: 'Participations Battle Royale'
  },
  { 
    key: 'brWinRate', 
    label: 'Victoires', 
    component: BRWinRateChart,
    description: 'Taux de victoire Battle Royale'
  },
  { 
    key: 'brKills', 
    label: 'Kills', 
    component: BRKillsStatsChart,
    description: 'Statistiques de score et kills'
  },
  { 
    key: 'brMini', 
    label: 'Mini BR', 
    component: BRMiniChart,
    description: 'Mini Battle Royale (2-5 joueurs)'
  },
];

export default function App() {
  return (
    <SettingsProvider>
      <NavigationProvider>
        <FullscreenProvider>
          <MainApp />
        </FullscreenProvider>
      </NavigationProvider>
    </SettingsProvider>
  );
}

function MainApp() {
  const { settings, updateSettings } = useSettings();
  const { currentView, requestedTab, clearTabNavigation, clearNavigation, updateNavigationState } = useNavigation();
  const [selectedMainTab, setSelectedMainTab] = useState('playerSelection');
  const [selectedPlayerStat, setSelectedPlayerStat] = useState('playersGeneral');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('evolution');
  const [selectedBRStat, setSelectedBRStat] = useState('brParticipations');
  const [showChangelog, setShowChangelog] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Helper function to update URL with pushState when tabs change
  const updateTabUrl = (tab: string, subtab: string | null = null) => {
    mergeUrlState({
      tab,
      subtab: subtab || undefined,
      view: undefined, // Clear navigation view when changing tabs
      selectedPlayer: undefined,
      selectedGame: undefined,
      fromComponent: undefined,
      deathStatsView: undefined, // Clear death stats view when changing tabs/subtabs
      seriesView: undefined, // Clear series view when changing tabs/subtabs
    }, 'push'); // Use pushState to create history entry
  };

  // Handler for achievement badge click
  const handleAchievementClick = () => {
    // Determine default player based on data source
    const defaultPlayer = settings.dataSource === 'discord' ? 'Nales' : 'Ponce';
    
    // Set player if none is currently highlighted
    const playerToHighlight = settings.highlightedPlayer || defaultPlayer;
    
    // Update settings with highlighted player
    if (!settings.highlightedPlayer) {
      updateSettings({ highlightedPlayer: playerToHighlight });
    }
    
    // Navigate to player selection achievements view
    setSelectedMainTab('playerSelection');
    updateNavigationState({
      selectedPlayerSelectionView: 'achievements'
    });
    updateTabUrl('playerSelection', null);
  };

  // Sync URL tab params to component state on mount and browser navigation
  useEffect(() => {
    if (settings.tab) {
      setSelectedMainTab(settings.tab);
      if (settings.subtab) {
        if (settings.tab === 'rankings') {
          setSelectedPlayerStat(settings.subtab);
        } else if (settings.tab === 'general') {
          setSelectedGeneralStat(settings.subtab);
        } else if (settings.tab === 'br') {
          setSelectedBRStat(settings.subtab);
        }
      }
    }
  }, [settings.tab, settings.subtab]);

  // Handle tab navigation requests from NavigationContext
  useEffect(() => {
    if (requestedTab) {
      setSelectedMainTab(requestedTab.mainTab);
      if (requestedTab.subTab) {
        if (requestedTab.mainTab === 'rankings') {
          setSelectedPlayerStat(requestedTab.subTab);
        } else if (requestedTab.mainTab === 'general') {
          setSelectedGeneralStat(requestedTab.subTab);
        } else if (requestedTab.mainTab === 'br') {
          setSelectedBRStat(requestedTab.subTab);
        }
      }
      clearTabNavigation();
    }
  }, [requestedTab, clearTabNavigation]);

  // When navigating to game details from a chart, highlight the gameDetails tab
  const effectiveMainTab = currentView === 'gameDetails' ? 'gameDetails' : selectedMainTab;

  const renderContent = () => {
    // Chart-driven navigation to game details takes precedence over selectedMainTab
    if (currentView === 'gameDetails') {
      return (
        <div className="lycans-dashboard-content">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSkeleton type="chart" height="600px" />}>
              <GameDetailsChart />
            </Suspense>
          </ErrorBoundary>
        </div>
      );
    }

    switch (selectedMainTab) {
      
      case 'playerSelection': {
        return (
          <div className="lycans-dashboard-content">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="chart" height="600px" />}>
                <PlayerSelectionPage />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }
    
      case 'rankings': {
        const SelectedPlayerComponent = PLAYER_STATS_MENU.find(m => m.key === selectedPlayerStat)?.component ?? PlayersGeneralStatisticsChart;
        return (
          <div>
            <nav className="lycans-submenu">
              {PLAYER_STATS_MENU.map(item => (
                <button
                  key={item.key}
                  className={`lycans-submenu-btn${selectedPlayerStat === item.key ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedPlayerStat(item.key);
                    updateTabUrl('rankings', item.key);
                  }}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <ErrorBoundary>
                <Suspense fallback={<LoadingSkeleton type="chart" height="500px" />}>
                  <SelectedPlayerComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        );
      }
      case 'general': {
        // Filter menu items based on data source
        const filteredGeneralMenu = GENERAL_STATS_MENU.filter(item => {
          // Hide "Types de Victoire" when dataSource is 'discord'
          if (item.key === 'victoryTypes' && settings.dataSource === 'discord') {
            return false;
          }
          return true;
        });
        
        const SelectedGeneralComponent = GENERAL_STATS_MENU.find(m => m.key === selectedGeneralStat)?.component ?? CampsChart;
         return (
          <div>
            <nav className="lycans-submenu">
              {filteredGeneralMenu.map(item => (
                <button
                  key={item.key}
                  className={`lycans-submenu-btn${selectedGeneralStat === item.key ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedGeneralStat(item.key);
                    updateTabUrl('general', item.key);
                  }}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <ErrorBoundary>
                <Suspense fallback={<LoadingSkeleton type="chart" height="500px" />}>
                  <SelectedGeneralComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        );
      }
      case 'br': {
        const SelectedBRComponent = BR_STATS_MENU.find(m => m.key === selectedBRStat)?.component ?? BRParticipationsChart;
        return (
          <div>
            <nav className="lycans-submenu">
              {BR_STATS_MENU.map(item => (
                <button
                  key={item.key}
                  className={`lycans-submenu-btn${selectedBRStat === item.key ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedBRStat(item.key);
                    updateTabUrl('br', item.key);
                  }}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <ErrorBoundary>
                <Suspense fallback={<LoadingSkeleton type="chart" height="500px" />}>
                  <SelectedBRComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        );
      }
      case 'gameDetails': {
        return (
          <div className="lycans-dashboard-content">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="chart" height="600px" />}>
                <GameDetailsChart />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }
      case 'clips': {
        return (
          <div className="lycans-dashboard-content">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="chart" height="500px" />}>
                <ClipsPage />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }
      case 'settings': {
        return (
          <div className="lycans-dashboard-content">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="card" height="400px" />}>
                <SettingsPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
        <div className="app-container">
          <img
            className="lycans-banner"
            src={`${import.meta.env.BASE_URL}lycansBannerSVG.svg`}
            alt="Lycans Banner"
          />
          <div className="main-container">
            <div className="lycans-dashboard-container">
              <header className="lycans-dashboard-header">
                <div className="lycans-header-content">
                  <VersionDisplay 
                    onVersionClick={() => setShowChangelog(true)} 
                    onAchievementClick={handleAchievementClick}
                  />
                </div>
              </header>

              <nav className="lycans-main-menu">
                {MAIN_TABS
                  .filter(tab => {
                    // Hide "Battle Royale" when dataSource is 'discord'
                    if (tab.key === 'br' && settings.dataSource === 'discord') {
                      return false;
                    }
                    return true;
                  })
                  .map(tab => (
                    <button
                      key={tab.key}
                      className={`lycans-main-menu-btn${effectiveMainTab === tab.key ? ' active' : ''}`}
                      onClick={() => {
                        // Clear navigation state when switching tabs during chart-driven navigation
                        if (currentView === 'gameDetails') {
                          clearNavigation();
                        }
                        setSelectedMainTab(tab.key);
                        // Determine default subtab for tabs that have subtabs
                        let defaultSubtab: string | null = null;
                        if (tab.key === 'rankings') defaultSubtab = selectedPlayerStat;
                        else if (tab.key === 'general') defaultSubtab = selectedGeneralStat;
                        else if (tab.key === 'br') defaultSubtab = selectedBRStat;
                        updateTabUrl(tab.key, defaultSubtab);
                      }}
                      type="button"
                      title={tab.description}
                    >
                      <span className="tab-icon">{tab.icon}</span>
                      <span className="tab-label">{tab.label}</span>
                      {tab.key === 'settings' && <SettingsBadge />}
                    </button>
                  ))}
              </nav>

              <div className="lycans-dashboard-section">
                <SettingsIndicator />
                {renderContent()}
              </div>

              <footer className="lycans-dashboard-footer">
                <p>Soldat Flippy - AmberAerin - Maalch - 2026</p>
                <p>
                  <a 
                    href="mailto:admin@lycanstracker.fr" 
                    className="contact-link"
                    title="Contactez-nous pour vos commentaires et suggestions"
                  >
                    📧 Contact & Feedback
                  </a>
                  <span className="footer-separator"> • </span>
                  <button 
                    onClick={() => setShowPrivacyPolicy(true)}
                    className="contact-link privacy-link"
                    title="Consultez notre politique de confidentialité"
                  >
                    🔒 Confidentialité
                  </button>
                  <span className="footer-separator"> • </span>
                  <a
                    href="https://github.com/Maalch/stats-lycansv2"
                    className="contact-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Voir le code source sur GitHub"
                  >
                    💻 GitHub
                  </a>
                </p>
              </footer>
            </div>
          </div>
        </div>

        {/* Changelog overlay */}
        {showChangelog && (
          <ChangelogPage onClose={() => setShowChangelog(false)} />
        )}

        {/* Privacy policy overlay */}
        {showPrivacyPolicy && (
          <PrivacyPolicyPage onClose={() => setShowPrivacyPolicy(false)} />
        )}
      </>
  );
}
import { Suspense, lazy, useState, useEffect } from 'react';
import { FullscreenProvider } from './context/FullscreenContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { SettingsIndicator } from './components/common/SettingsIndicator';
import { SettingsBadge } from './components/common/SettingsBadge';
import { useLastRecordedGameDate } from './hooks/useLastRecordedGameDate';
import './App.css';

// Lazy load each dashboard section
const PlayersGeneralStatisticsChart = lazy(() => import('./components/playerstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/playerstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerCampPerformanceChart = lazy(() => import('./components/playerstats/PlayerCampPerformanceChart').then(m => ({ default: m.PlayerCampPerformanceChart })));
const PlayerComparisonChart = lazy(() => import('./components/playerstats/PlayerComparisonChart').then(m => ({ default: m.PlayerComparisonChart })));
const PlayerSeriesChart = lazy(() => import('./components/playerstats/PlayerSeriesChart').then(m => ({ default: m.PlayerSeriesChart })));
const TalkingTimeChart = lazy(() => import('./components/playerstats/TalkingTimeChart').then(m => ({ default: m.TalkingTimeChart })));

// Death statistics components
const DeathStatisticsChart = lazy(() => import('./components/playerstats/DeathsAndKills/DeathStatisticsChart').then(m => ({ default: m.DeathStatisticsChart })));

// Voting statistics components
const VotingStatisticsChart = lazy(() => import('./components/playerstats/Voting/VotingStatisticsChart').then(m => ({ default: m.VotingStatisticsChart })));

// Color statistics components
const ColorStatisticsChart = lazy(() => import('./components/playerstats/ColorStatisticsChart').then(m => ({ default: m.ColorStatisticsChart })));

const CampsChart = lazy(() => import('./components/generalstats/CampsChart').then(m => ({ default: m.CampsChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));
const VictoryTypesChart = lazy(() => import('./components/generalstats/VictoryTypesChart').then(m => ({ default: m.VictoryTypesChart })));
const GlobalVotingStatsChart = lazy(() => import('./components/generalstats/GlobalVotingStatsChart').then(m => ({ default: m.GlobalVotingStatsChart })));
const RolesStatsChart = lazy(() => import('./components/generalstats/RolesStatsChart').then(m => ({ default: m.RolesStatsChart })));

const BRParticipationsChart = lazy(() => import('./components/brstats/BRParticipationsChart').then(m => ({ default: m.BRParticipationsChart })));
const BRWinRateChart = lazy(() => import('./components/brstats/BRWinRateChart').then(m => ({ default: m.BRWinRateChart })));
const BRKillsStatsChart = lazy(() => import('./components/brstats/BRKillsStatsChart').then(m => ({ default: m.BRKillsStatsChart })));
const BRMiniChart = lazy(() => import('./components/brstats/BRMiniChart').then(m => ({ default: m.BRMiniChart })));

//const DeathLocationHeatmap = lazy(() => import('./components/generalstats/DeathLocationHeatmap').then(m => ({ default: m.DeathLocationHeatmap })));

const GameDetailsChart = lazy(() => import('./components/gamedetails/GameDetailsChart').then(m => ({ default: m.GameDetailsChart })));

// Add settings import
const SettingsPanel = lazy(() => import('./components/settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

// Player selection page
const PlayerSelectionPage = lazy(() => import('./components/playerselection/PlayerSelectionPage').then(m => ({ default: m.PlayerSelectionPage })));

// Import VersionDisplay component
import { VersionDisplay } from './components/common/VersionDisplay';
import { ChangelogPage } from './components/common/ChangelogPage';

const MAIN_TABS = [
  { 
    key: 'playerSelection', 
    label: 'Sélection Joueur', 
    icon: '🏆',
    description: 'Choisir un joueur et voir ses succès'
  },
  { 
    key: 'players', 
    label: 'Joueurs', 
    icon: '👤',
    description: 'Statistiques des joueurs'
  },
  { 
    key: 'general', 
    label: 'Parties', 
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
    label: 'Victoires', 
    component: PlayersGeneralStatisticsChart,
    description: 'Classement par participations et victoires'
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
    key: 'campPerformance', 
    label: 'Performances', 
    component: PlayerCampPerformanceChart,
    description: 'Meilleurs performances (par rapport à la moyenne), par camp'
  },
  { 
    key: 'comparison', 
    label: 'Face à Face', 
    component: PlayerComparisonChart,
    description: 'Comparaison détaillée entre deux joueurs'
  },


];

const GENERAL_STATS_MENU = [
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
  /*
  { 
    key: 'heatmap', 
    label: 'Heatmap', 
    component: DeathLocationHeatmap,
    description: 'Carte de chaleur des localisations de mort'
  },
  */
  { 
    key: 'colorStats', 
    label: 'Couleurs', 
    component: ColorStatisticsChart,
    description: 'Statistiques sur les couleurs des joueurs'
  },
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
  const { settings } = useSettings();
  const { currentView, requestedTab, clearTabNavigation } = useNavigation();
  const { lastRecordedGameDate, isLoading: dateLoading } = useLastRecordedGameDate();
  const [selectedMainTab, setSelectedMainTab] = useState('playerSelection');
  const [selectedPlayerStat, setSelectedPlayerStat] = useState('playersGeneral');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('camps');
  const [selectedBRStat, setSelectedBRStat] = useState('brParticipations');
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [showChangelog, setShowChangelog] = useState(false);

  // Helper function to format the subtitle text
  const getSubtitleText = () => {
    if (dateLoading) {
      return "Chargement des données...";
    }
    if (lastRecordedGameDate) {
      return `Données à jour jusqu'au ${lastRecordedGameDate}`;
    }
    return "";
  };

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle tab navigation requests
  useEffect(() => {
    if (requestedTab) {
      setSelectedMainTab(requestedTab.mainTab);
      if (requestedTab.subTab) {
        if (requestedTab.mainTab === 'players') {
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

  // Check if we're in TestZone route (hash-based)
  const isTestZone = currentHash === '#/TestZone';

  // If we're in TestZone, show test components
  if (isTestZone) {
   
    return (
      <div className="app-container">
        <img
          className="lycans-banner"
          src={`${import.meta.env.BASE_URL}lycansBannerSVG.svg`}
          alt="Lycans Banner"
        />
        <div className="main-container">
          <div className="lycans-dashboard-container">
            <header className="lycans-dashboard-header">
              <h1>Zone de Test - Statistiques Lycans</h1>
              <p>Composants en développement</p>
              <button 
                onClick={() => {
                  window.location.hash = '';
                }}
                className="lycans-back-button"
                style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
              >
                ← Retour au dashboard principal
              </button>
            </header>
            
            
            <div className="lycans-dashboard-section">
              <SettingsIndicator />
              <div className="lycans-dashboard-content">
                <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>

                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we're in game details view, show that instead of the normal tabs
  if (currentView === 'gameDetails') {
    return (
      <div className="app-container">
        <img
          className="lycans-banner"
          src={`${import.meta.env.BASE_URL}lycansBannerSVG.svg`}
          alt="Lycans Banner"
        />
        <div className="main-container">
          <div className="lycans-dashboard-container">
            <header className="lycans-dashboard-header">
              <h1>Statistiques Lycans</h1>
              <p>{getSubtitleText()}</p>
            </header>
            <div className="lycans-dashboard-section">
              <SettingsIndicator />
              <div className="lycans-dashboard-content">
                <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
                  <GameDetailsChart />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedMainTab) {
      
      case 'playerSelection': {
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <PlayerSelectionPage />
            </Suspense>
          </div>
        );
      }
    
      case 'players': {
        const SelectedPlayerComponent = PLAYER_STATS_MENU.find(m => m.key === selectedPlayerStat)?.component ?? PlayersGeneralStatisticsChart;
        return (
          <div>
            <nav className="lycans-submenu">
              {PLAYER_STATS_MENU.map(item => (
                <button
                  key={item.key}
                  className={`lycans-submenu-btn${selectedPlayerStat === item.key ? ' active' : ''}`}
                  onClick={() => setSelectedPlayerStat(item.key)}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
                <SelectedPlayerComponent />
              </Suspense>
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
                  onClick={() => setSelectedGeneralStat(item.key)}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
                <SelectedGeneralComponent />
              </Suspense>
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
                  onClick={() => setSelectedBRStat(item.key)}
                  type="button"
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
                <SelectedBRComponent />
              </Suspense>
            </div>
          </div>
        );
      }
      case 'gameDetails': {
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <GameDetailsChart />
            </Suspense>
          </div>
        );
      }
      case 'settings': {
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <SettingsPanel />
            </Suspense>
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
                  <div className="lycans-header-main">
                <h1>Statistiques Lycans</h1>
                <p>{getSubtitleText()}</p>
                  </div>
                  <VersionDisplay onVersionClick={() => setShowChangelog(true)} />
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
                      className={`lycans-main-menu-btn${selectedMainTab === tab.key ? ' active' : ''}`}
                      onClick={() => setSelectedMainTab(tab.key)}
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
                <p>Soldat Flippy - AmberAerin - Maalch - 2025</p>
                <p>
                  <a 
                    href="mailto:admin@lycanstracker.fr" 
                    className="contact-link"
                    title="Contactez-nous pour vos commentaires et suggestions"
                  >
                    📧 Contact & Feedback
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
      </>
  );
}
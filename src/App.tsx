import { Suspense, lazy, useState, useEffect } from 'react';
import { FullscreenProvider } from './context/FullscreenContext';
import { SettingsProvider } from './context/SettingsContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { SettingsIndicator } from './components/common/SettingsIndicator';
import { SettingsBadge } from './components/common/SettingsBadge';
import './App.css';

// Lazy load each dashboard section
const PlayersGeneralStatisticsChart = lazy(() => import('./components/playerstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerGameHistoryChart = lazy(() => import('./components/playerstats/PlayerGameHistoryChart').then(m => ({ default: m.PlayerGameHistoryChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/playerstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerCampPerformanceChart = lazy(() => import('./components/playerstats/PlayerCampPerformanceChart').then(m => ({ default: m.PlayerCampPerformanceChart })));
const PlayerComparisonChart = lazy(() => import('./components/playerstats/PlayerComparisonChart').then(m => ({ default: m.PlayerComparisonChart })));

const CampsChart = lazy(() => import('./components/generalstats/CampsChart').then(m => ({ default: m.CampsChart })));
const VictoryTypesChart = lazy(() => import('./components/generalstats/VictoryTypesChart').then(m => ({ default: m.VictoryTypesChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));

const BRGeneralStatsChart = lazy(() => import('./components/brstats/BRGeneralStatsChart').then(m => ({ default: m.BRGeneralStatsChart })));

const GameDetailsChart = lazy(() => import('./components/gamedetails/GameDetailsChart').then(m => ({ default: m.GameDetailsChart })));

// Add settings import
const SettingsPanel = lazy(() => import('./components/settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

const MAIN_TABS = [
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
    label: 'Paramètres', 
    icon: '⚙️',
    description: 'Filtres et configuration'
  },
  //{ key: 'ponce', label: 'Ponce' },
];

const PLAYER_STATS_MENU = [
  { 
    key: 'playersGeneral', 
    label: 'Joueurs', 
    component: PlayersGeneralStatisticsChart,
    description: 'Classement par participations et victoires'
  },
  { 
    key: 'history', 
    label: 'Historique Joueur', 
    component: PlayerGameHistoryChart,
    description: 'Détails par joueur'
  },
  { 
    key: 'pairing', 
    label: 'Paires de Joueurs', 
    component: PlayerPairingStatsChart,
    description: 'Paires de loups et d\'amoureux'
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
    key: 'victoryTypes', 
    label: 'Types de Victoire', 
    component: VictoryTypesChart,
    description: 'Détails par type de victoire'
  },
  { 
    key: 'harvest', 
    label: 'Récolte', 
    component: HarvestProgressChart,
    description: 'Détails sur la récolte villageoise'
  },
  { 
    key: 'duration', 
    label: 'Durée des Parties', 
    component: GameDurationInsights,
    description: 'Statistiques sur la durée des parties (en jours de jeu)'
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
  const { currentView } = useNavigation();
  const [selectedMainTab, setSelectedMainTab] = useState('players');
  const [selectedPlayerStat, setSelectedPlayerStat] = useState('playersGeneral');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('camps');
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check if we're in TestZone route (hash-based)
  const isTestZone = currentHash === '#/TestZone';

  // If we're in TestZone, show the PlayerComparisonChart
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
                  <PlayerComparisonChart />
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
              <p>Basées sur les VOD des parties de Ponce uniquement</p>
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
    
      case 'players': {
        const SelectedPlayerComponent = PLAYER_STATS_MENU.find(m => m.key === selectedPlayerStat)?.component ?? PlayerGameHistoryChart;
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
        const SelectedGeneralComponent = GENERAL_STATS_MENU.find(m => m.key === selectedGeneralStat)?.component ?? CampsChart;
         return (
          <div>
            <nav className="lycans-submenu">
              {GENERAL_STATS_MENU.map(item => (
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
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <BRGeneralStatsChart />
            </Suspense>
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
      {/* Uncomment when Ponce stats are implemented}
      case 'ponce': {
        const SelectedPonceComponent = PONCE_STATS_MENU[0].component;
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <SelectedPonceComponent />
            </Suspense>
          </div>
        );
      }
      */}
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
                <p>Basées sur les VOD des parties de Ponce uniquement</p>
              </header>

              <nav className="lycans-main-menu">
                {MAIN_TABS.map(tab => (
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
                    href="mailto:lycansdata@gmail.com" 
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
  );
}
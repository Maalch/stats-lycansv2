import { Suspense, lazy, useState } from 'react';
import { FullscreenProvider } from './context/FullscreenContext';
import { SettingsProvider } from './context/SettingsContext';
import './App.css';

// Lazy load each dashboard section
const PlayersGeneralStatisticsChart = lazy(() => import('./components/playerstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerGameHistoryChart = lazy(() => import('./components/playerstats/PlayerGameHistoryChart').then(m => ({ default: m.PlayerGameHistoryChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/playerstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerCampPerformanceChart = lazy(() => import('./components/playerstats/PlayerCampPerformanceChart').then(m => ({ default: m.PlayerCampPerformanceChart })));

const CampsChart = lazy(() => import('./components/generalstats/CampsChart').then(m => ({ default: m.CampsChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));

// Add settings import
const SettingsPanel = lazy(() => import('./components/settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

const MAIN_TABS = [
  { key: 'players', label: 'Statistiques Joueurs' },
  { key: 'general', label: 'Statistiques Générales' },
  { key: 'settings', label: 'Paramètres' },
  //{ key: 'ponce', label: 'Statistiques Survie Ponce' },
];

const PLAYER_STATS_MENU = [
  { key: 'playersGeneral', label: 'Joueurs', component: PlayersGeneralStatisticsChart },
  { key: 'history', label: 'Historique Joueur', component: PlayerGameHistoryChart },
  { key: 'pairing', label: 'Paires de Joueurs', component: PlayerPairingStatsChart }, 
  { key: 'campPerformance', label: 'Performances', component: PlayerCampPerformanceChart }, 
];

const GENERAL_STATS_MENU = [
  { key: 'camps', label: 'Camps', component: CampsChart },
  { key: 'harvest', label: 'Récolte', component: HarvestProgressChart },
  { key: 'duration', label: 'Durée des Parties', component: GameDurationInsights },
];


{/*}
const PONCE_STATS_MENU = [
  { key: '', label: '', component:  },
];
*/}

export default function App() {
  const [selectedMainTab, setSelectedMainTab] = useState('players');
  const [selectedPlayerStat, setSelectedPlayerStat] = useState('playersGeneral');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('camps');

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
      <SettingsProvider>
        <FullscreenProvider>
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
                  <p>Analyse des parties, rôles et performances</p>
                </header>

                <nav className="lycans-main-menu">
                  {MAIN_TABS.map(tab => (
                    <button
                      key={tab.key}
                      className={`lycans-main-menu-btn${selectedMainTab === tab.key ? ' active' : ''}`}
                      onClick={() => setSelectedMainTab(tab.key)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <div className="lycans-dashboard-section">
                  {renderContent()}
                </div>

                <footer className="lycans-dashboard-footer">
                  <p>Soldat Flippy - AmberAerin - Maalch - 2025</p>
                </footer>
              </div>
            </div>
          </div>
        </FullscreenProvider>
      </SettingsProvider>
  );
}
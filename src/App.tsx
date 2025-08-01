import { Suspense, lazy, useState } from 'react';
import './App.css';

// Lazy load each dashboard section
const CampsAndRolesRateChart = lazy(() => import('./components/generalstats/CampsAndRolesRateChart').then(m => ({ default: m.CampsAndRolesRateChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));
const PlayersGeneralStatisticsChart = lazy(() => import('./components/generalstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/generalstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerGameHistoryChart = lazy(() => import('./components/playerstats/PlayerGameHistoryChart').then(m => ({ default: m.PlayerGameHistoryChart })));
const RoleSurvivalRateChart = lazy(() => import('./components/poncestats/PonceRoleSurvivalRateChart').then(m => ({ default: m.RoleSurvivalRateChart })));

const MAIN_TABS = [
  { key: 'general', label: 'Statistiques Générales' },
  { key: 'players', label: 'Statistiques par joueur' },
  { key: 'ponce', label: 'Statistiques Survie Ponce' },
];

const GENERAL_STATS_MENU = [
  { key: 'playersGeneral', label: 'Joueurs', component: PlayersGeneralStatisticsChart },
  { key: 'pairing', label: 'Paires de Joueurs', component: PlayerPairingStatsChart }, 
  { key: 'camp', label: 'Camps et Roles', component: CampsAndRolesRateChart },
  { key: 'harvest', label: 'Récolte', component: HarvestProgressChart },
  { key: 'duration', label: 'Durée des Parties', component: GameDurationInsights },
];

const PLAYER_STATS_MENU = [
  { key: 'history', label: 'Historique Joueur', component: PlayerGameHistoryChart },
];

const PONCE_STATS_MENU = [
  { key: 'roles', label: 'Survie par Rôle', component: RoleSurvivalRateChart },
];

export default function App() {
  const [selectedMainTab, setSelectedMainTab] = useState('general');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('playersGeneral');

 const renderContent = () => {
    switch (selectedMainTab) {
      case 'general': {
        const SelectedGeneralComponent = GENERAL_STATS_MENU.find(m => m.key === selectedGeneralStat)?.component ?? PlayersGeneralStatisticsChart;
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
      case 'players': {
        // Always show the first component in PLAYER_STATS_MENU
        const SelectedPlayerComponent = PLAYER_STATS_MENU[0].component;
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <SelectedPlayerComponent />
            </Suspense>
          </div>
        );
      }
      case 'ponce': {
        // Always show the first component in PONCE_STATS_MENU
        const SelectedPonceComponent = PONCE_STATS_MENU[0].component;
        return (
          <div className="lycans-dashboard-content">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <SelectedPonceComponent />
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
            <p>Données mises à jour automatiquement depuis le Google Sheets de Soldat Flippy</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
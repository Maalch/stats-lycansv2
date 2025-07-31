import { Suspense, lazy, useState } from 'react';
import './App.css';

// Lazy load each dashboard section
const CampsAndRolesRateChart = lazy(() => import('./components/generalstats/CampsAndRolesRateChart').then(m => ({ default: m.CampsAndRolesRateChart })));
const HarvestProgressChart = lazy(() => import('./components/generalstats/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const RoleSurvivalRateChart = lazy(() => import('./components/poncestats/PonceRoleSurvivalRateChart').then(m => ({ default: m.RoleSurvivalRateChart })));
const GameDurationInsights = lazy(() => import('./components/generalstats/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));
const PlayerGeneralStatisticsChart = lazy(() => import('./components/generalstats/PlayersGeneralStatisticsChart').then(m => ({ default: m.PlayersGeneralStatisticsChart })));
const PlayerPairingStatsChart = lazy(() => import('./components/playerstats/PlayerPairingStatsChart').then(m => ({ default: m.PlayerPairingStatsChart })));
const PlayerGameHistoryChart = lazy(() => import('./components/playerstats/PlayerGameHistoryChart').then(m => ({ default: m.PlayerGameHistoryChart })));

const MAIN_TABS = [
  { key: 'general', label: 'Statistiques Générales' },
  { key: 'ponce', label: 'Statistiques Ponce' },
  { key: 'players', label: 'Statistiques par joueur' },
];

const GENERAL_STATS_MENU = [
  { key: 'camp', label: 'Camps et Roles', component: CampsAndRolesRateChart },
  { key: 'harvest', label: 'Récolte', component: HarvestProgressChart },
  { key: 'duration', label: 'Durée des Parties', component: GameDurationInsights },
  { key: 'playersGeneral', label: 'Joueurs', component: PlayerGeneralStatisticsChart },
];

const PONCE_STATS_MENU = [
  { key: 'roles', label: 'Survie par Rôle', component: RoleSurvivalRateChart },
];

const PLAYER_STATS_MENU = [
  { key: 'pairing', label: 'Paires de Joueurs', component: PlayerPairingStatsChart },
  { key: 'history', label: 'Historique Joueur', component: PlayerGameHistoryChart },
];

export default function App() {
  const [selectedMainTab, setSelectedMainTab] = useState('general');
  const [selectedGeneralStat, setSelectedGeneralStat] = useState('camp');
  const [selectedPonceStat, setSelectedPonceStat] = useState('roles');
  const [selectedPlayerStat, setSelectedPlayerStat] = useState('pairing');

  const renderContent = () => {
    switch (selectedMainTab) {
      case 'general':
        const SelectedGeneralComponent = GENERAL_STATS_MENU.find(m => m.key === selectedGeneralStat)?.component ?? CampsAndRolesRateChart;
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

      case 'ponce':
        const SelectedPonceComponent = PONCE_STATS_MENU.find(m => m.key === selectedPonceStat)?.component ?? RoleSurvivalRateChart;
        return (
          <div>
            <nav className="lycans-submenu">
              {PONCE_STATS_MENU.map(item => (
                <button
                  key={item.key}
                  className={`lycans-submenu-btn${selectedPonceStat === item.key ? ' active' : ''}`}
                  onClick={() => setSelectedPonceStat(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="lycans-dashboard-content">
              <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
                <SelectedPonceComponent />
              </Suspense>
            </div>
          </div>
        );

      case 'players':
        const SelectedPlayerComponent = PLAYER_STATS_MENU.find(m => m.key === selectedPlayerStat)?.component ?? PlayerPairingStatsChart;
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
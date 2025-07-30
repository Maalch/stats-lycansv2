import { Suspense, lazy, useState } from 'react';
import './App.css';

// Lazy load each dashboard section
const CampWinRateChart = lazy(() => import('./components/CampWinRateChart').then(m => ({ default: m.CampWinRateChart })));
const HarvestProgressChart = lazy(() => import('./components/HarvestProgressChart').then(m => ({ default: m.HarvestProgressChart })));
const RoleSurvivalRateChart = lazy(() => import('./components/RoleSurvivalRateChart').then(m => ({ default: m.RoleSurvivalRateChart })));
const GameDurationInsights = lazy(() => import('./components/GameDurationInsights').then(m => ({ default: m.GameDurationInsights })));

const MENU = [
  { key: 'camp', label: 'Victoires par Camp', component: CampWinRateChart },
  { key: 'harvest', label: 'Statistiques Récolte', component: HarvestProgressChart },
  { key: 'roles', label: 'Survie des Rôles', component: RoleSurvivalRateChart },
  { key: 'duration', label: 'Durée des Parties', component: GameDurationInsights },
];

export default function App() {
  const [selected, setSelected] = useState('camp');
  const SelectedComponent = MENU.find(m => m.key === selected)?.component ?? CampWinRateChart;

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

          <nav className="lycans-menu">
            {MENU.map(item => (
              <button
                key={item.key}
                className={`lycans-menu-btn${selected === item.key ? ' active' : ''}`}
                onClick={() => setSelected(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="lycans-dashboard-section">
            <Suspense fallback={<div className="statistiques-chargement">Chargement...</div>}>
              <SelectedComponent />
            </Suspense>
          </div>

          <footer className="lycans-dashboard-footer">
            <p>Données mises à jour automatiquement depuis le Google Sheets de Soldat Flippy</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
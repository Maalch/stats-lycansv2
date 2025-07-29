import { CampWinRateChart } from './components/CampWinRateChart';
import { HarvestProgressChart } from './components/HarvestProgressChart';
import { RoleSurvivalRateChart } from './components/RoleSurvivalRateChart';
import { GameDurationInsights } from './components/GameDurationInsights';

import './App.css'; 


function App() {
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

          <div className="lycans-dashboard-section">
            <CampWinRateChart />
          </div>

          <div className="lycans-dashboard-section">
            <HarvestProgressChart />
          </div>

          <div className="lycans-dashboard-section">
            <RoleSurvivalRateChart />
          </div>

          <div className="lycans-dashboard-section">
            <GameDurationInsights />
          </div>

          <footer className="lycans-dashboard-footer">
            <p>Données mises à jour automatiquement depuis Google Sheets</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
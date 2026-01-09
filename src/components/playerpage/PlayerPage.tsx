import { usePlayerInsights } from './usePlayerInsights';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { usePreCalculatedPlayerAchievements } from '../../hooks/usePreCalculatedPlayerAchievements';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { AchievementsDisplay } from '../playerselection/AchievementsDisplay';
import { PlayerIdentityCard } from './sections/PlayerIdentityCard';
import { PlayerPlaystyleAnalysis } from './sections/PlayerPlaystyleAnalysis';
import { PlayerStrengthsWeaknesses } from './sections/PlayerStrengthsWeaknesses';
import { PlayerComparisons } from './sections/PlayerComparisons';
import { PlayerFunFacts } from './sections/PlayerFunFacts';
import './PlayerPage.css';

export function PlayerPage() {
  const { settings } = useSettings();
  const { navigateBack } = useNavigation();
  const playerName = settings.highlightedPlayer;
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  const { data: insights, isLoading, error } = usePlayerInsights(playerName);
  const { data: achievements, isLoading: achievementsLoading, error: achievementsError } = usePreCalculatedPlayerAchievements(playerName);
  
  if (!playerName) {
    return (
      <div className="player-page-container">
        <div className="player-page-empty">
          <h2>Aucun joueur sélectionné</h2>
          <p>Sélectionnez un joueur depuis la page "Joueur" pour voir son profil détaillé.</p>
          <button 
            className="back-button"
            onClick={() => navigateBack()}
            type="button"
          >
            ← Retour à la sélection
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="player-page-container">
        <div className="player-page-loading">
          <div className="loading-spinner"></div>
          <p>Chargement du profil de {playerName}...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="player-page-container">
        <div className="player-page-error">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button 
            className="back-button"
            onClick={() => navigateBack()}
            type="button"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }
  
  if (!insights) {
    return (
      <div className="player-page-container">
        <div className="player-page-empty">
          <h2>Joueur non trouvé</h2>
          <p>Aucune donnée trouvée pour {playerName}.</p>
          <button 
            className="back-button"
            onClick={() => navigateBack()}
            type="button"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="player-page-container">
      {/* Identity Card Section */}
      <PlayerIdentityCard 
        identity={insights.identity} 
        playerColor={playersColor[playerName]}
      />
      
      {/* Main Content Grid */}
      <div className="player-page-grid">
        {/* Left Column */}
        <div className="player-page-column">
          {/* Playstyle Analysis */}
          <PlayerPlaystyleAnalysis playstyle={insights.playstyle} />
          
          {/* Strengths & Weaknesses */}
          <PlayerStrengthsWeaknesses 
            strengths={insights.strengths} 
            weaknesses={insights.weaknesses} 
          />
        </div>
        
        {/* Right Column */}
        <div className="player-page-column">
          {/* Comparisons */}
          <PlayerComparisons comparisons={insights.comparisons} />
          
          {/* Fun Facts */}
          <PlayerFunFacts funFacts={insights.funFacts} />
        </div>
      </div>
      
      {/* Achievements Section - Full Width */}
      <div className="player-page-section player-page-achievements">
        <h2 className="section-title">🏆 Classements</h2>
        {achievementsLoading ? (
          <div className="achievements-loading">
            <div className="loading-spinner small"></div>
            <p>Chargement des classements...</p>
          </div>
        ) : achievementsError ? (
          <div className="achievements-error">
            <p>❌ Erreur: {achievementsError}</p>
          </div>
        ) : achievements ? (
          <AchievementsDisplay
            achievements={achievements.allGamesAchievements}
            title=""
            emptyMessage="Aucun classement disponible"
            achievementType="all"
          />
        ) : (
          <p className="no-achievements">Aucun classement disponible pour ce joueur.</p>
        )}
      </div>
    </div>
  );
}

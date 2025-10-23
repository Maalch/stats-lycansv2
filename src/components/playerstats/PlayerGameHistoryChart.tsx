import { useMemo } from 'react';
import { usePlayerStatsFromRaw } from '../../hooks/usePlayerStatsFromRaw';
import { usePlayerGameHistoryFromRaw } from '../../hooks/usePlayerGameHistoryFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  PlayerHistoryEvolution, 
  PlayerHistoryCamp, 
  PlayerHistoryMap, 
  PlayerHistoryKills,
  type GroupByMethod
} from './playerhistory';

type ViewType = 'performance' | 'camp' | 'map' | 'kills';

export function PlayerGameHistoryChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();

  // Get available players from the player stats hook
  const { data: playerStatsData } = usePlayerStatsFromRaw();

  // Create list of available players for the dropdown
  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return ['Ponce'];
    const players = playerStatsData.playerStats
      .filter(player => player.gamesPlayed > 0)
      .map(player => player.player)
      .sort();
    
    // Ensure highlighted player is in the list if it exists and has games
    if (settings.highlightedPlayer && 
        !players.includes(settings.highlightedPlayer) && 
        playerStatsData.playerStats.some(p => p.player === settings.highlightedPlayer && p.gamesPlayed > 0)) {
      players.push(settings.highlightedPlayer);
      players.sort();
    }
    
    return players;
  }, [playerStatsData, settings.highlightedPlayer]);

  // Use navigationState for persistence, with smart fallback logic
  const getDefaultSelectedPlayer = () => {
    // First priority: existing navigation state
    if (navigationState.selectedPlayerName && availablePlayers.includes(navigationState.selectedPlayerName)) {
      return navigationState.selectedPlayerName;
    }

    // Second priority: highlighted player from settings (if available)
    if (settings.highlightedPlayer && availablePlayers.includes(settings.highlightedPlayer)) {
      return settings.highlightedPlayer;
    }

    // Third priority: select 'Ponce' if present, else first available player
    if (availablePlayers.includes('Ponce')) {
      return 'Ponce';
    }
    return availablePlayers[0] || '';
  };

  const selectedPlayerName = getDefaultSelectedPlayer();
  const groupingMethod = (navigationState.groupingMethod || 'session') as GroupByMethod;
  const selectedViewType = (navigationState.selectedViewType || 'performance') as ViewType;
  
  // Update functions that also update the navigation state
  const setSelectedPlayerName = (playerName: string) => {
    updateNavigationState({ selectedPlayerName: playerName });
  };
  
  const setGroupingMethod = (method: GroupByMethod) => {
    updateNavigationState({ groupingMethod: method });
  };

  const setSelectedViewType = (viewType: ViewType) => {
    updateNavigationState({ selectedViewType: viewType });
  };

  // Get data for summary cards
  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);

  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'historique du joueur...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée d'historique disponible</div>;
  }

  return (
    <div className="lycans-player-history">
      <h2>Historique Détaillé d'un Joueur</h2>
      
      {/* Player Selection Control */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="player-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Joueur:
          </label>
          <select
            id="player-select"
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '120px'
            }}
          >
            {availablePlayers.map(player => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Type Selection */}
      <div className="lycans-categories-selection">
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'performance' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('performance')}
        >
          Évolution
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'camp' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('camp')}
        >
          Camp
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'map' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('map')}
        >
          Map
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'kills' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('kills')}
        >
          Kills
        </button>
      </div>

      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Total Parties</h3>
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                fromComponent: 'Historique Joueur - Total Parties'
              });
            }}
            title={`Cliquer pour voir toutes les parties de ${selectedPlayerName}`}
          >
            {data.totalGames}
          </div>
          <p>parties jouées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Victoires</h3>
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                selectedPlayerWinMode: 'wins-only',
                fromComponent: 'Historique Joueur - Victoires'
              });
            }}
            title={`Cliquer pour voir toutes les victoires de ${selectedPlayerName}`}
          >
            {data.totalWins}
          </div>
          <p>parties gagnées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Taux de Victoire</h3>
          <div className="lycans-valeur-principale">{data.winRate}%</div>
          <p>pourcentage global</p>
        </div>
      </div>

      {/* Performance View */}
      {selectedViewType === 'performance' && (
        <>
          {/* Grouping Control - Only for Performance View */}
          <div className="lycans-controls-section" style={{ 
            display: 'flex', 
            gap: '2rem', 
            marginBottom: '2rem', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="grouping-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Groupement:
              </label>
              <select
                id="grouping-select"
                value={groupingMethod}
                onChange={(e) => setGroupingMethod(e.target.value as GroupByMethod)}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  minWidth: '120px'
                }}
              >
                <option value="session">Par session</option>
                <option value="month">Par mois</option>
              </select>
            </div>
          </div>

          <PlayerHistoryEvolution 
            selectedPlayerName={selectedPlayerName}
            groupingMethod={groupingMethod}
          />
        </>
      )}

      {/* Camp View */}
      {selectedViewType === 'camp' && (
        <PlayerHistoryCamp selectedPlayerName={selectedPlayerName} />
      )}

      {/* Map View */}
      {selectedViewType === 'map' && (
        <PlayerHistoryMap selectedPlayerName={selectedPlayerName} />
      )}

      {/* Kills View */}
      {selectedViewType === 'kills' && (
        <PlayerHistoryKills selectedPlayerName={selectedPlayerName} />
      )}
    </div>
  );
}
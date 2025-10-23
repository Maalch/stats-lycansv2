import { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGameLogData } from '../../hooks/useCombinedRawData';
import { usePreCalculatedPlayerAchievements } from '../../hooks/usePreCalculatedPlayerAchievements';
import { usePlayerGameHistoryFromRaw } from '../../hooks/usePlayerGameHistoryFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { getPlayerId, getPlayerDisplayName } from '../../utils/playerIdentification';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { AchievementsDisplay } from './AchievementsDisplay';
import { 
  PlayerHistoryEvolution, 
  PlayerHistoryCamp, 
  PlayerHistoryMap, 
  PlayerHistoryKills,
  type GroupByMethod
} from '../playerstats/playerhistory';
import type { GameLogEntry } from '../../hooks/useCombinedRawData';
import './PlayerSelectionPage.css';

interface PlayerBasicStats {
  name: string;
  totalGames: number;
  totalWins: number;
  winRate: number;
  firstGameDate: string;
  lastGameDate: string;
  isHighlighted: boolean;
  image?: string | null;
  twitch?: string | null;
  youtube?: string | null;
}

export function PlayerSelectionPage() {
  const { settings, updateSettings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const { data: gameLogData, isLoading, error } = useGameLogData();
  const { joueursData, isLoading: joueursLoading } = useJoueursData();
  const { data: playerAchievements, isLoading: achievementsLoading, error: achievementsError } = usePreCalculatedPlayerAchievements(settings.highlightedPlayer);
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const [searchQuery, setSearchQuery] = useState('');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'modded'>('all');
  const [selectedView, setSelectedView] = useState<'achievements' | 'evolution' | 'camps' | 'maps' | 'kills'>('achievements');
  const [groupingMethod, setGroupingMethod] = useState<GroupByMethod>('session');

  // Get player history data for summary cards (only when a player is highlighted)
  const { data: playerHistoryData } = usePlayerGameHistoryFromRaw(settings.highlightedPlayer || '');

  // Calculate basic stats for all players
  const playerStats = useMemo(() => {
    if (!gameLogData || !gameLogData.GameStats) return [];

    // Group by unique player ID (Steam ID or Username fallback)
    const playerMap = new Map<string, {
      games: number;
      wins: number;
      firstDate: Date;
      lastDate: Date;
      displayName: string; // Store the canonical display name
    }>();

    gameLogData.GameStats.forEach((game: GameLogEntry) => {
      const gameDate = new Date(game.StartDate);
      
      game.PlayerStats.forEach((playerStat) => {
        // Use the playerIdentification utility to get unique ID
        const playerId = getPlayerId(playerStat);
        
        // Find canonical player name from joueurs.json
        const playerInfo = joueursData?.Players?.find(p => p.ID === playerId);
        const canonicalName = playerInfo?.Joueur || getPlayerDisplayName(playerStat);
        
        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            games: 0,
            wins: 0,
            firstDate: gameDate,
            lastDate: gameDate,
            displayName: canonicalName,
          });
        }
        
        const stats = playerMap.get(playerId)!;
        stats.games++;
        if (playerStat.Victorious) {
          stats.wins++;
        }
        
        if (gameDate < stats.firstDate) {
          stats.firstDate = gameDate;
        }
        if (gameDate > stats.lastDate) {
          stats.lastDate = gameDate;
        }
      });
    });

    return Array.from(playerMap.entries()).map(([playerId, stats]): PlayerBasicStats => {
      // Find player data from joueurs.json by ID first, then fall back to name matching
      let playerInfo = joueursData?.Players?.find(p => p.ID === playerId);
      
      // If not found by ID, try matching by name (for main joueurs.json which uses SteamID field)
      if (!playerInfo) {
        playerInfo = joueursData?.Players?.find(p => p.Joueur === stats.displayName);
      }
      
      return {
        name: stats.displayName,
        totalGames: stats.games,
        totalWins: stats.wins,
        winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
        firstGameDate: stats.firstDate.toLocaleDateString('fr-FR'),
        lastGameDate: stats.lastDate.toLocaleDateString('fr-FR'),
        isHighlighted: stats.displayName === settings.highlightedPlayer,
        image: playerInfo?.Image || null,
        twitch: playerInfo?.Twitch || null,
        youtube: playerInfo?.Youtube || null,
      };
    });
  }, [gameLogData, settings.highlightedPlayer, joueursData]);

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return playerStats;
    
    const query = searchQuery.toLowerCase();
    return playerStats.filter(player => 
      player.name.toLowerCase().includes(query)
    );
  }, [playerStats, searchQuery]);

  // Sort filtered players by total games (participation) for suggestions
  const sortedFilteredPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => b.totalGames - a.totalGames);
  }, [filteredPlayers]);

  const handlePlayerSelect = (playerName: string) => {
    updateSettings({ highlightedPlayer: playerName });
    setSearchQuery(''); // Clear search to show the selected player's card
  };

  if (isLoading || joueursLoading) {
    return (
      <div className="player-selection-loading">
        <div className="loading-spinner"></div>
        <p>Chargement des joueurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-selection-error">
        <h2>Erreur</h2>
        <p>Impossible de charger les données des joueurs: {error}</p>
      </div>
    );
  }

  if (!gameLogData || playerStats.length === 0) {
    return (
      <div className="player-selection-empty">
        <h2>Aucune donnée disponible</h2>
        <p>Aucun joueur trouvé dans les données.</p>
      </div>
    );
  }

  return (
    <div className="player-selection-container">
      {/* Always visible search controls */}
      {!settings.highlightedPlayer && (
        <div className="search-controls-header">
          <div className="selection-prompt-content">
            <h2>Sélectionnez un joueur</h2>
            <p>Choisissez un joueur pour le mettre en évidence dans tous les graphiques.</p>
          </div>
          
          <div className="search-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="player-count">
              {filteredPlayers.length} joueur{filteredPlayers.length !== 1 ? 's' : ''} 
              {searchQuery && ` (filtré${filteredPlayers.length !== 1 ? 's' : ''} de ${playerStats.length})`}
            </div>
          </div>
        </div>
      )}

      <div className="player-display">
        {searchQuery ? (
          // Show search results when there's a search query
          filteredPlayers.length > 0 ? (
            <div className="search-results">
              <div className="search-results-header">
                <h3>Résultats de recherche:</h3>
                <button 
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Effacer la recherche
                </button>
              </div>
              <div className="suggestion-list">
                {sortedFilteredPlayers.map((player) => (
                  <button
                    key={player.name}
                    className={`suggestion-btn ${player.isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handlePlayerSelect(player.name)}
                  >
                    {player.image ? (
                      <img 
                        src={player.image} 
                        alt={player.name}
                        className="player-avatar"
                      />
                    ) : (
                      <div 
                        className="player-avatar-default"
                        style={{ 
                          '--player-color': playersColor[player.name] || 'var(--accent-primary)'
                        } as React.CSSProperties}
                      >
                        <div className="player-avatar-overlay"></div>
                      </div>
                    )}
                    <div className="suggestion-btn-content">
                      <div className="suggestion-btn-name">
                        {player.name}
                        {player.isHighlighted && <span className="highlight-indicator"> ★</span>}
                      </div>
                      <div className="suggestion-btn-stats">
                        {player.totalGames} parties • {player.winRate.toFixed(1)}% victoires
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-results">
              <p>Aucun joueur trouvé pour "{searchQuery}"</p>
              <button 
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                Effacer la recherche
              </button>
            </div>
          )
        ) : settings.highlightedPlayer ? (
          // Show the highlighted player's card when no search query
          (() => {
            const highlightedPlayerStats = playerStats.find(p => p.name === settings.highlightedPlayer);
            if (!highlightedPlayerStats) {
              return (
                <div className="no-player-found">
                  <p>Le joueur "{settings.highlightedPlayer}" n'a pas été trouvé dans les données.</p>
                  <button 
                    className="clear-selection-btn"
                    onClick={() => updateSettings({ highlightedPlayer: null })}
                  >
                    Effacer la sélection
                  </button>
                </div>
              );
            }
            
            return (
              <div className="single-player-card highlighted">
                <div className="player-card-header">
                  <h3 className="player-name">{highlightedPlayerStats.name}</h3>
                  <span className="highlight-badge">★ Mis en évidence</span>
                </div>
                
                <div className="player-info-row">
                  {highlightedPlayerStats.image ? (
                    <img 
                      src={highlightedPlayerStats.image} 
                      alt={highlightedPlayerStats.name}
                      className="player-avatar large"
                    />
                  ) : (
                    <div 
                      className="player-avatar-default large"
                      style={{ 
                        '--player-color': playersColor[highlightedPlayerStats.name] || 'var(--accent-primary)'
                      } as React.CSSProperties}
                    >
                      <div className="player-avatar-overlay"></div>
                    </div>
                  )}
                  <div className="player-info-text">
                    <div className="player-stats-summary">
                      {highlightedPlayerStats.totalGames} parties • {highlightedPlayerStats.totalWins} victoires • {highlightedPlayerStats.winRate.toFixed(1)}% taux de victoire
                    </div>
                    {(highlightedPlayerStats.twitch || highlightedPlayerStats.youtube) && (
                      <div className="social-links">
                        {highlightedPlayerStats.twitch && (
                          <a 
                            href={highlightedPlayerStats.twitch} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link twitch"
                          >
                            📺 Twitch
                          </a>
                        )}
                        {highlightedPlayerStats.youtube && (
                          <a 
                            href={highlightedPlayerStats.youtube} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link youtube"
                          >
                            🎬 YouTube
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                                             
                <div className="player-actions">                  
                  {/* View Type Selection */}
                  <div className="lycans-categories-selection" style={{ marginBottom: '1rem' }}>
                    <button
                      className={`lycans-categorie-btn ${selectedView === 'achievements' ? 'active' : ''}`}
                      onClick={() => setSelectedView('achievements')}
                    >
                      Classement
                    </button>
                    <button
                      className={`lycans-categorie-btn ${selectedView === 'evolution' ? 'active' : ''}`}
                      onClick={() => setSelectedView('evolution')}
                    >
                      Évolution
                    </button>
                    <button
                      className={`lycans-categorie-btn ${selectedView === 'camps' ? 'active' : ''}`}
                      onClick={() => setSelectedView('camps')}
                    >
                      Camps
                    </button>
                    <button
                      className={`lycans-categorie-btn ${selectedView === 'maps' ? 'active' : ''}`}
                      onClick={() => setSelectedView('maps')}
                    >
                      Maps
                    </button>
                    <button
                      className={`lycans-categorie-btn ${selectedView === 'kills' ? 'active' : ''}`}
                      onClick={() => setSelectedView('kills')}
                    >
                      Kills
                    </button>
                  </div>

                  {/* Achievements Display */}
                  {selectedView === 'achievements' && (
                    <div className="achievements-section">
                      {achievementsLoading ? (
                        <div className="achievements-loading">
                          <div className="loading-spinner"></div>
                          <p>Chargement des classements...</p>
                        </div>
                      ) : achievementsError ? (
                        <div className="achievements-error">
                          <p>❌ Erreur lors du chargement des classements: {achievementsError}</p>
                        </div>
                      ) : playerAchievements ? (
                        <AchievementsDisplay
                          achievements={achievementFilter === 'all' 
                            ? playerAchievements.allGamesAchievements 
                            : playerAchievements.moddedOnlyAchievements
                          }
                          title={achievementFilter === 'all' 
                            ? 'Classements - Toutes les parties' 
                            : 'Classements - Parties moddées'
                          }
                          emptyMessage="Aucun classement dans cette catégorie"
                          achievementType={achievementFilter}
                        />
                      ) : (
                        <div className="achievements-empty">
                          <p>Aucun classement disponible pour ce joueur</p>
                        </div>
                      )}
                      <div className="achievements-filter">
                        <button
                          className={`filter-btn ${achievementFilter === 'all' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAchievementFilter('all');
                          }}
                        >
                          Toutes les parties
                        </button>
                        <button
                          className={`filter-btn ${achievementFilter === 'modded' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAchievementFilter('modded');
                          }}
                        >
                          Parties moddées
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Evolution View */}
                  {selectedView === 'evolution' && (
                    <div className="player-history-section">
                      {/* Summary Cards */}
                      {playerHistoryData && (
                        <div className="lycans-resume-conteneur">
                          <div className="lycans-stat-carte">
                            <h3>Total Parties</h3>
                            <div 
                              className="lycans-valeur-principale lycans-clickable" 
                              onClick={() => {
                                navigateToGameDetails({
                                  selectedPlayer: highlightedPlayerStats.name,
                                  fromComponent: 'Historique Joueur - Total Parties'
                                });
                              }}
                              title={`Cliquer pour voir toutes les parties de ${highlightedPlayerStats.name}`}
                            >
                              {playerHistoryData.totalGames}
                            </div>
                            <p>parties jouées</p>
                          </div>
                          <div className="lycans-stat-carte">
                            <h3>Victoires</h3>
                            <div 
                              className="lycans-valeur-principale lycans-clickable" 
                              onClick={() => {
                                navigateToGameDetails({
                                  selectedPlayer: highlightedPlayerStats.name,
                                  selectedPlayerWinMode: 'wins-only',
                                  fromComponent: 'Historique Joueur - Victoires'
                                });
                              }}
                              title={`Cliquer pour voir toutes les victoires de ${highlightedPlayerStats.name}`}
                            >
                              {playerHistoryData.totalWins}
                            </div>
                            <p>parties gagnées</p>
                          </div>
                          <div className="lycans-stat-carte">
                            <h3>Taux de Victoire</h3>
                            <div className="lycans-valeur-principale">{playerHistoryData.winRate}%</div>
                            <p>pourcentage global</p>
                          </div>
                        </div>
                      )}

                      {/* Grouping Control - Only for Evolution View */}
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
                              minWidth: '160px'
                            }}
                          >
                            <option value="session">Par session</option>
                            <option value="month">Par mois</option>
                            <option value="quarter">Par trimestre</option>
                            <option value="year">Par année</option>
                          </select>
                        </div>
                      </div>
                      <PlayerHistoryEvolution 
                        selectedPlayerName={highlightedPlayerStats.name}
                        groupingMethod={groupingMethod}
                      />
                    </div>
                  )}

                  {/* Camp View */}
                  {selectedView === 'camps' && (
                    <div className="player-history-section">
                      <PlayerHistoryCamp selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  {/* Map View */}
                  {selectedView === 'maps' && (
                    <div className="player-history-section">
                      <PlayerHistoryMap selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  {/* Kills View */}
                  {selectedView === 'kills' && (
                    <div className="player-history-section">
                      <PlayerHistoryKills selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  <button
                    className="highlight-btn active"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSettings({ highlightedPlayer: null });
                    }}
                  >
                    ★ Retirer la mise en évidence
                  </button>
                </div>
                
                <div className="player-period">
                  <span className="period-label">Période d'activité:</span>
                  <span className="period-range">
                    {highlightedPlayerStats.firstGameDate} - {highlightedPlayerStats.lastGameDate}
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          // Show character selection grid when no player is highlighted
          <div className="player-selection-prompt">
            
            <div className="character-selection-grid">
              {sortedFilteredPlayers.map((player) => (
                  <div
                    key={player.name}
                    className={`character-card ${player.isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handlePlayerSelect(player.name)}
                    title={`${player.name} - ${player.totalGames} parties, ${player.winRate.toFixed(1)}% victoires`}
                  >
                    <div className="character-avatar-container">
                      {player.image ? (
                        <img 
                          src={player.image} 
                          alt={player.name}
                          className="character-avatar"
                        />
                      ) : (
                        <div 
                          className="character-avatar-default"
                          style={{ 
                            '--player-color': playersColor[player.name] || 'var(--accent-primary)'
                          } as React.CSSProperties}
                        >
                          <div className="character-avatar-overlay"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="character-name">
                      {player.name}
                    </div>
                    
                    {(player.twitch || player.youtube) && (
                      <div className="character-social-indicators">
                        {player.twitch && (
                          <div className="social-indicator twitch" title="Twitch">
                            T
                          </div>
                        )}
                        {player.youtube && (
                          <div className="social-indicator youtube" title="YouTube">
                            Y
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
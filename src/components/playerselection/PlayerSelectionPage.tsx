import { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGameLogData } from '../../hooks/useCombinedRawData';
import { usePreCalculatedPlayerAchievements } from '../../hooks/usePreCalculatedPlayerAchievements';
import { useJoueursData } from '../../hooks/useJoueursData';
import { getPlayerNameMapping } from '../../utils/playerNameMapping';
import { findPlayerByName } from '../../utils/playersUtils';
import { useThemeAdjustedPlayersColor } from '../../types/api';
import { AchievementsDisplay } from './AchievementsDisplay';
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
  const { data: gameLogData, isLoading, error } = useGameLogData();
  const { joueursData, isLoading: joueursLoading } = useJoueursData();
  const { data: playerAchievements, isLoading: achievementsLoading, error: achievementsError } = usePreCalculatedPlayerAchievements(settings.highlightedPlayer);
  const playersColor = useThemeAdjustedPlayersColor();
  const [searchQuery, setSearchQuery] = useState('');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'modded'>('all');

  // Calculate basic stats for all players
  const playerStats = useMemo(() => {
    if (!gameLogData || !gameLogData.GameStats) return [];

    const playerMap = new Map<string, {
      games: number;
      wins: number;
      firstDate: Date;
      lastDate: Date;
    }>();

    gameLogData.GameStats.forEach((game: GameLogEntry) => {
      const gameDate = new Date(game.StartDate);
      
      game.PlayerStats.forEach((playerStat) => {
        const playerName = getPlayerNameMapping(playerStat.Username);
        
        if (!playerMap.has(playerName)) {
          playerMap.set(playerName, {
            games: 0,
            wins: 0,
            firstDate: gameDate,
            lastDate: gameDate,
          });
        }
        
        const stats = playerMap.get(playerName)!;
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

    return Array.from(playerMap.entries()).map(([name, stats]): PlayerBasicStats => {
      // Find player data from joueurs.json
      const playerInfo = joueursData?.Players ? findPlayerByName(joueursData.Players, name) : null;
      
      return {
        name,
        totalGames: stats.games,
        totalWins: stats.wins,
        winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
        firstGameDate: stats.firstDate.toLocaleDateString('fr-FR'),
        lastGameDate: stats.lastDate.toLocaleDateString('fr-FR'),
        isHighlighted: name === settings.highlightedPlayer,
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
                        className="player-avatar-placeholder"
                        style={{ backgroundColor: playersColor[player.name] || 'var(--accent-primary)' }}
                      >
                        {player.name.charAt(0).toUpperCase()}
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
                      className="player-avatar-placeholder large"
                      style={{ backgroundColor: playersColor[highlightedPlayerStats.name] || 'var(--accent-primary)' }}
                    >
                      {highlightedPlayerStats.name.charAt(0).toUpperCase()}
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
                  {/* Achievements Display */}
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
                          className="character-avatar-placeholder"
                          style={{ backgroundColor: playersColor[player.name] || 'var(--accent-primary)' }}
                        >
                          {player.name.charAt(0).toUpperCase()}
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
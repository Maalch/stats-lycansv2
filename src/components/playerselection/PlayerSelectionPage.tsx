import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGameLogData } from '../../hooks/useCombinedRawData';
import { usePreCalculatedPlayerAchievements } from '../../hooks/usePreCalculatedPlayerAchievements';
import { usePlayerGameHistoryFromRaw } from '../../hooks/usePlayerGameHistoryFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { getPlayerId } from '../../utils/playerIdentification';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { formatCumulativeDuration } from '../../utils/durationFormatters';
import { AchievementsDisplay } from './AchievementsDisplay';
import { 
  PlayerHistoryEvolution, 
  PlayerHistoryCamp, 
  PlayerHistoryMap, 
  PlayerHistoryKills,
  PlayerHistoryRoles,
  PlayerHistoryDeathMap,
  PlayerHistoryTalkingTime,
  type GroupByMethod,
  type CampFilterOption
} from '../playerstats/playerhistory';
import type { GameLogEntry, Clip } from '../../hooks/useCombinedRawData';
import { usePlayerClips } from '../../hooks/useClips';
import { ClipViewer } from '../common/ClipViewer';
import { findRelatedClips, findNextClip } from '../../utils/clipUtils';
import { useAllClips } from '../../hooks/useClips';
import './PlayerSelectionPage.css';

interface PlayerBasicStats {
  id: string; // Unique player ID 
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
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { data: gameLogData, isLoading, error } = useGameLogData();
  const { joueursData, isLoading: joueursLoading } = useJoueursData();
  const { data: playerAchievements, isLoading: achievementsLoading, error: achievementsError } = usePreCalculatedPlayerAchievements(settings.highlightedPlayer);
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  
  // Get player clips for random clip feature
  const { clips: playerClips } = usePlayerClips(settings.highlightedPlayer);
  const { clips: allClips } = useAllClips();
  
  // Initialize achievementFilter based on global gameFilter setting
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'modded'>(() => {
    // Check if independent filters are enabled and gameTypeEnabled is true
    if (settings.useIndependentFilters && settings.independentFilters?.gameTypeEnabled) {
      return settings.independentFilters.gameFilter === 'modded' ? 'modded' : 'all';
    }
    // Fallback to legacy gameFilter
    return settings.gameFilter === 'modded' ? 'modded' : 'all';
  });
  
  // Determine if we're in "modded only" mode (cannot switch to "all")
  const isModdedOnlyMode = useMemo(() => {
    // Check if independent filters are enabled and gameTypeEnabled is true
    if (settings.useIndependentFilters && settings.independentFilters?.gameTypeEnabled) {
      return settings.independentFilters.gameFilter === 'modded';
    }
    // Fallback to legacy gameFilter
    return settings.gameFilter === 'modded';
  }, [settings.useIndependentFilters, settings.independentFilters?.gameTypeEnabled, settings.independentFilters?.gameFilter, settings.gameFilter]);
  
  // Use navigationState to restore view selection, fallback to 'achievements'
  const [selectedView, setSelectedView] = useState<'achievements' | 'evolution' | 'camps' | 'maps' | 'kills' | 'roles' | 'deathmap' | 'talkingtime'>(
    navigationState.selectedPlayerSelectionView || 'achievements'
  );
  const [groupingMethod, setGroupingMethod] = useState<GroupByMethod>('session');
  const [campFilter, setCampFilter] = useState<CampFilterOption>('all');

  // Sync achievementFilter with global gameFilter when it changes
  useEffect(() => {
    // Check if independent filters are enabled and gameTypeEnabled is true
    if (settings.useIndependentFilters && settings.independentFilters?.gameTypeEnabled) {
      const newFilter = settings.independentFilters.gameFilter === 'modded' ? 'modded' : 'all';
      setAchievementFilter(newFilter);
    } else if (!settings.useIndependentFilters) {
      // Fallback to legacy gameFilter
      const newFilter = settings.gameFilter === 'modded' ? 'modded' : 'all';
      setAchievementFilter(newFilter);
    }
  }, [settings.gameFilter, settings.useIndependentFilters, settings.independentFilters?.gameTypeEnabled, settings.independentFilters?.gameFilter]);
  
  // Force achievementFilter to 'modded' when in modded-only mode
  useEffect(() => {
    if (isModdedOnlyMode && achievementFilter !== 'modded') {
      setAchievementFilter('modded');
    }
  }, [isModdedOnlyMode, achievementFilter]);

  // Sync selectedView with navigationState when it changes (for external navigation like changelog links)
  useEffect(() => {
    if (navigationState.selectedPlayerSelectionView) {
      setSelectedView(navigationState.selectedPlayerSelectionView);
    }
  }, [navigationState.selectedPlayerSelectionView]);

  // Get player history data for summary cards (only when a player is highlighted)
  const { data: playerHistoryData } = usePlayerGameHistoryFromRaw(settings.highlightedPlayer || '');

  // Calculate basic stats for all players
  const playerStats = useMemo(() => {
    if (!gameLogData || !gameLogData.GameStats) return [];

    // Filter games based on modded-only mode
    const filteredGames = isModdedOnlyMode 
      ? gameLogData.GameStats.filter(game => game.Modded === true)
      : gameLogData.GameStats;

    // Group by unique player ID (Steam ID or Username fallback)
    const playerMap = new Map<string, {
      games: number;
      wins: number;
      firstDate: Date;
      lastDate: Date;
      displayName: string; // Store the canonical display name
    }>();

    filteredGames.forEach((game: GameLogEntry) => {
      const gameDate = new Date(game.StartDate);
      
      game.PlayerStats.forEach((playerStat) => {
        // Use the playerIdentification utility to get unique ID
        const playerId = getPlayerId(playerStat);
        
        // Find canonical player name from joueurs.json
        const playerInfo = joueursData?.Players?.find(p => p.SteamID === playerId);
        // Player names are already normalized during data loading, but prefer joueurs.json if available
        const canonicalName = playerInfo?.Joueur || playerStat.Username;
        
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
      // Find player data from joueurs.json by SteamID first, then fall back to name matching
      let playerInfo = joueursData?.Players?.find(p => p.SteamID === playerId);
      
      // If not found by SteamID, try matching by name
      if (!playerInfo) {
        playerInfo = joueursData?.Players?.find(p => p.Joueur === stats.displayName);
      }
      
      return {
        id: playerId, // Use the unique player ID as the identifier
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
  }, [gameLogData, settings.highlightedPlayer, joueursData, isModdedOnlyMode]);

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

  // Helper function to handle view changes and sync with navigation state
  const handleViewChange = (newView: 'achievements' | 'evolution' | 'camps' | 'maps' | 'kills' | 'roles' | 'deathmap' | 'talkingtime') => {
    setSelectedView(newView);
    updateNavigationState({ selectedPlayerSelectionView: newView });
  };
  
  // Handler for random clip button
  const handleRandomClip = () => {
    if (playerClips.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playerClips.length);
    setSelectedClip(playerClips[randomIndex]);
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
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Effacer la recherche
                </button>
              </div>
              <div className="suggestion-list">
                {sortedFilteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className={`suggestion-btn ${player.isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handlePlayerSelect(player.name)}
                  >
                    {player.image ? (
                      <img 
                        src={player.image} 
                        alt={`Photo de profil de ${player.name}`}
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
                type="button"
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
                    type="button"
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
                      alt={`Photo de profil de ${highlightedPlayerStats.name}`}
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
                    {(highlightedPlayerStats.twitch || highlightedPlayerStats.youtube || playerClips.length > 0) && (
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
                        {/* Clips Section */}
                        {playerClips.length > 0 && (
                          <button
                            type="button"
                            className="social-link clips-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRandomClip();
                            }}
                            title={`${playerClips.length} clip${playerClips.length > 1 ? 's' : ''} disponible${playerClips.length > 1 ? 's' : ''}`}
                          >
                            🎬 Clip aléatoire ({playerClips.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                                             
                <div className="player-actions">                  
                  {/* View Type Selection */}
                  <div className="lycans-categories-selection" style={{ marginBottom: '1rem' }}>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'achievements' ? 'active' : ''}`}
                      onClick={() => handleViewChange('achievements')}
                    >
                      Classement
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'evolution' ? 'active' : ''}`}
                      onClick={() => handleViewChange('evolution')}
                    >
                      Évolution
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'camps' ? 'active' : ''}`}
                      onClick={() => handleViewChange('camps')}
                    >
                      Camps
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'roles' ? 'active' : ''}`}
                      onClick={() => handleViewChange('roles')}
                    >
                      Rôles
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'maps' ? 'active' : ''}`}
                      onClick={() => handleViewChange('maps')}
                    >
                      Maps
                    </button>

                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'kills' ? 'active' : ''}`}
                      onClick={() => handleViewChange('kills')}
                    >
                      Kills
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'deathmap' ? 'active' : ''}`}
                      onClick={() => handleViewChange('deathmap')}
                    >
                      Carte
                    </button>
                    <button
                      type="button"
                      className={`lycans-categorie-btn ${selectedView === 'talkingtime' ? 'active' : ''}`}
                      onClick={() => handleViewChange('talkingtime')}
                    >
                      Parole
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
                        {!isModdedOnlyMode && (
                          <button
                            type="button"
                            className={`filter-btn ${achievementFilter === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAchievementFilter('all');
                            }}
                          >
                            Toutes les parties
                          </button>
                        )}
                        <button
                          type="button"
                          className={`filter-btn ${achievementFilter === 'modded' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAchievementFilter('modded');
                          }}
                          disabled={isModdedOnlyMode}
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
                          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
                            <h3>Total Parties</h3>
                            <div 
                              className="lycans-valeur-principale lycans-clickable" 
                              onClick={() => {
                                navigateToGameDetails({
                                  selectedPlayer: highlightedPlayerStats.name,
                                  fromComponent: 'Historique Joueur - Total Parties'
                                }
                              );
                              }}
                              title={`Cliquer pour voir toutes les parties de ${highlightedPlayerStats.name}`}
                              style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}
                            >
                              {playerHistoryData.totalGames}
                            </div>
                            <p>parties jouées</p>
                          </div>
                          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
                            <h3>Temps de jeu cumulés</h3>
                            <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                              {formatCumulativeDuration(playerHistoryData.totalPlayTime)}
                            </div>
                            <p>temps total de jeu</p>
                          </div>
                          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
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
                              style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}
                            >
                              {playerHistoryData.totalWins}
                            </div>
                            <p>parties gagnées</p>
                          </div>
                          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
                            <h3>Taux de Victoire</h3>
                            <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>{playerHistoryData.winRate}%</div>
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
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label htmlFor="camp-filter-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Camp:
                          </label>
                          <select
                            id="camp-filter-select"
                            value={campFilter}
                            onChange={(e) => setCampFilter(e.target.value as CampFilterOption)}
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
                            <option value="all">Tous les camps</option>
                            <option value="Villageois">Villageois</option>
                            <option value="Loup">Loups</option>
                            <option value="solo">Rôles solo</option>
                          </select>
                        </div>
                      </div>
                      <PlayerHistoryEvolution 
                        selectedPlayerName={highlightedPlayerStats.name}
                        groupingMethod={groupingMethod}
                        campFilter={campFilter}
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

                  {/* Roles View */}
                  {selectedView === 'roles' && (
                    <div className="player-history-section">
                      <PlayerHistoryRoles selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  {/* Kills View */}
                  {selectedView === 'kills' && (
                    <div className="player-history-section">
                      <PlayerHistoryKills selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  {/* Death Map View */}
                  {selectedView === 'deathmap' && (
                    <div className="player-history-section">
                      <PlayerHistoryDeathMap selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  {/* Talking Time View */}
                  {selectedView === 'talkingtime' && (
                    <div className="player-history-section">
                      <PlayerHistoryTalkingTime selectedPlayerName={highlightedPlayerStats.name} />
                    </div>
                  )}

                  <button
                    type="button"
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
                    key={player.id}
                    className={`character-card ${player.isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handlePlayerSelect(player.name)}
                    title={`${player.name} - ${player.totalGames} parties, ${player.winRate.toFixed(1)}% victoires`}
                  >
                    <div className="character-avatar-container">
                      {player.image ? (
                        <img 
                          src={player.image} 
                          alt={`Photo de profil de ${player.name}`}
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
      
      {/* Clip Viewer Modal */}
      {selectedClip && (
        <ClipViewer
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
          relatedClips={findRelatedClips(selectedClip, allClips)}
          nextClip={findNextClip(selectedClip, allClips)}
          onNextClip={() => {
            const next = findNextClip(selectedClip, allClips);
            if (next) setSelectedClip(next);
          }}
          onRelatedClip={(clipId) => {
            const related = allClips.find(c => c.ClipId === clipId);
            if (related) setSelectedClip(related);
          }}
        />
      )}
    </div>
  );
}
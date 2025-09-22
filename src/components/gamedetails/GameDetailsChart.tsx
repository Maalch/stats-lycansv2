import { useState, useMemo, useEffect, useRef } from 'react';
import { useGameDetailsFromRaw } from '../../hooks/useGameDetailsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';
import { GameDetailView } from './GameDetailView';
import './GameDetailsChart.css';

type SortField = 'date' | 'gameId' | 'playerCount' | 'gameDuration' | 'winningCamp'  | 'winner';
type SortDirection = 'asc' | 'desc';

export function GameDetailsChart() {
  const { navigationFilters, navigateBack } = useNavigation();
  const { settings } = useSettings();
  
  // Determine if we have any meaningful navigation filters
  const hasNavigationFilters = Boolean(
    navigationFilters.selectedPlayer ||
    navigationFilters.selectedGame ||
    navigationFilters.selectedVictoryType ||
    navigationFilters.selectedDate ||
    navigationFilters.selectedHarvestRange ||
    navigationFilters.selectedGameDuration ||
    (navigationFilters.selectedGameIds && navigationFilters.selectedGameIds.length > 0) ||
    navigationFilters.campFilter ||
    navigationFilters.playerPairFilter ||
    navigationFilters.multiPlayerFilter
  );
  
  // Pass highlighted player only if there are no navigation filters
  const highlightedPlayerForFiltering = hasNavigationFilters ? null : settings.highlightedPlayer;
  
  const { data, isLoading, error } = useGameDetailsFromRaw(navigationFilters, highlightedPlayerForFiltering);
  
// Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  // When the user explicitly changes page, some upstream hooks may re-create
  // the data array which would otherwise trigger the data-change effect and
  // reset the page back to 1. Use this ref to ignore the next data-change
  // reset if it was caused by a user page navigation.
  const ignoreDataResetRef = useRef(false);

  // Determine if we should show the winner column and get the target players
  const getTargetPlayers = (): string[] => {
    // Priority 1: Navigation filters (highest priority)
    if (navigationFilters.selectedPlayer) {
      return [navigationFilters.selectedPlayer];
    }
    if (navigationFilters.playerPairFilter?.selectedPlayerPair) {
      return navigationFilters.playerPairFilter.selectedPlayerPair;
    }
    if (navigationFilters.multiPlayerFilter?.selectedPlayers) {
      return navigationFilters.multiPlayerFilter.selectedPlayers;
    }
    
    // Priority 2: Highlighted player from settings (fallback)
    if (settings.highlightedPlayer) {
      return [settings.highlightedPlayer];
    }
    
    return [];
  };

  const targetPlayers = getTargetPlayers();
  const showWinnerColumn = targetPlayers.length > 0;

  // Get dynamic column name based on target players
  const getWinnerColumnName = (): string => {
    if (targetPlayers.length === 0) return 'Vainqueur';
    if (targetPlayers.length === 1) return targetPlayers[0] + ' (victoire)';
    if (targetPlayers.length === 2) return targetPlayers.join(' & ') + ' (victoires)';
    return `${targetPlayers.slice(0, 2).join(' & ')} (+${targetPlayers.length - 2}) (victoires)`;
  };

  // Helper function to get winners from target players for a specific game
  const getGameWinners = (game: any): string => {
    if (!showWinnerColumn) return '';
    
    // When we have highlighted player filtering (no navigation filters), 
    // we know all games contain the highlighted player, so skip the "not in game" check
    if (!hasNavigationFilters && highlightedPlayerForFiltering) {
      // Check if the highlighted player won this game
      const winners = game.winners ? game.winners.split(',').map((w: string) => w.trim()) : [];
      const targetWinners = winners.filter((winner: string) => 
        targetPlayers.some(player => 
          player.toLowerCase() === winner.toLowerCase()
        )
      );
      
      return targetWinners.length > 0 ? '✅' : '❌';
    }
    
    // For navigation filters, use the original logic with presence check
    // Get all players in this game
    const gamePlayers = game.playersList ? game.playersList.split(',').map((p: string) => p.trim()) : [];
    
    // Check if any target player is in this game
    const targetPlayersInGame = targetPlayers.filter(player => 
      gamePlayers.some((gamePlayer: string) => 
        gamePlayer.toLowerCase() === player.toLowerCase()
      )
    );
    
    // If no target players are in this game, show "not in game" indicator
    if (targetPlayersInGame.length === 0) {
      return 'Pas dans la partie';
    }
    
    // Check if any target player won this game
    const winners = game.winners ? game.winners.split(',').map((w: string) => w.trim()) : [];
    const targetWinners = winners.filter((winner: string) => 
      targetPlayers.some(player => 
        player.toLowerCase() === winner.toLowerCase()
      )
    );
    
    return targetWinners.length > 0 ? '✅' : '❌';
  };

  // Sort games
  const sortedGames = useMemo(() => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date.split('/').reverse().join('-')).getTime();
          bValue = new Date(b.date.split('/').reverse().join('-')).getTime();
          break;
        case 'gameId':
          // Parse DisplayedId as integer (global chronological game number)
          aValue = parseInt(a.gameId, 10);
          bValue = parseInt(b.gameId, 10);
          break;
        case 'playerCount':
          aValue = a.playerCount;
          bValue = b.playerCount;
          break;
        case 'gameDuration':
          aValue = a.gameDuration || 0;
          bValue = b.gameDuration || 0;
          break;
        case 'winningCamp':
          aValue = a.winningCamp;
          bValue = b.winningCamp;
          break;
        case 'winner':
          aValue = getGameWinners(a);
          bValue = getGameWinners(b);
          break;
        default:
          return 0;
      }
      
      // Primary sort comparison
      let primaryComparison: number;
      if (sortDirection === 'asc') {
        primaryComparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        primaryComparison = aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
      
      // If primary values are equal, sort by gameId as secondary sort
      if (primaryComparison === 0) {
        // Always sort gameId in descending order for secondary sort (most recent games first)
        const aGameId = parseInt(a.gameId, 10);
        const bGameId = parseInt(b.gameId, 10);
        
        return sortDirection === 'asc' ? 
          aGameId - bGameId : 
          bGameId - aGameId;
      }
      
      return primaryComparison;
    });
  }, [data, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGames = sortedGames.slice(startIndex, endIndex);

  // Reset to page 1 when data changes (but not when just sorting changes)
  useEffect(() => {
    // If a user-initiated page navigation set the ignore flag, skip the
    // automatic reset and clear the flag. This prevents brief flickers back
    // to page 1 when data is re-created by upstream hooks on navigation.
    if (ignoreDataResetRef.current) {
      ignoreDataResetRef.current = false;
      return;
    }

    setCurrentPage(1);
    setSelectedGameId(null); // Close any expanded game details when data changes
  }, [data]); // Only reset when the actual data changes

  // Reset to page 1 when itemsPerPage changes (handled in handleItemsPerPageChange)
  // Reset page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedGameId(null);
  }, [sortField, sortDirection]);

  const handlePageChange = (newPage: number) => {
  // Mark that this navigation is user-initiated so the data-change
  // effect won't reset the page when upstream recreates the data array.
  ignoreDataResetRef.current = true;
  setCurrentPage(newPage);
  setSelectedGameId(null); // Close any expanded game details when changing pages
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
  // Changing page size is a user action that should not be overridden by
  // the data-change reset that may follow. Set the ignore flag.
  ignoreDataResetRef.current = true;
  setItemsPerPage(newItemsPerPage);
  setCurrentPage(1);
  setSelectedGameId(null); // Close any expanded game details when changing page size
  };

  const handleToggleGameDetails = (gameId: string) => {
    // When expanding/collapsing game details, this is a user action that
    // should not be overridden by data-change resets. Set the ignore flag.
    ignoreDataResetRef.current = true;
    setSelectedGameId(selectedGameId === gameId ? null : gameId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↗️' : '↘️';
  };

  const getFilterSummary = () => {
    const filters = [];
    if (navigationFilters.selectedPlayer && navigationFilters.campFilter) {
      const playerWinModeText = navigationFilters.selectedPlayerWinMode === 'wins-only' ? ' (victoires uniquement)' : '';
      const campDisplayName = navigationFilters.campFilter.excludeTraitor && navigationFilters.campFilter.selectedCamp === 'Loup' 
        ? 'Loups sans Traître' 
        : navigationFilters.campFilter.selectedCamp;
      filters.push(`${navigationFilters.selectedPlayer} jouant ${campDisplayName}${playerWinModeText}`);
    } else {
      if (navigationFilters.selectedPlayer) {
        const playerWinModeText = navigationFilters.selectedPlayerWinMode === 'wins-only' ? ' (victoires uniquement)' : 
                                 navigationFilters.selectedPlayerWinMode === 'all-assignments' ? ' (toutes parties)' : '';
        filters.push(`Joueur: ${navigationFilters.selectedPlayer}${playerWinModeText}`);
      }
      if (navigationFilters.campFilter) {
        const { selectedCamp, campFilterMode, excludeTraitor } = navigationFilters.campFilter;
        const campDisplayName = excludeTraitor && selectedCamp === 'Loup' ? 'Loups sans Traître' : selectedCamp;
        const campFilterText = `Camp: ${campDisplayName}`;
        const modeText = campFilterMode === 'wins-only' ? ' (victoires uniquement)' : 
                         campFilterMode === 'all-assignments' ? ' (toutes assignations)' : '';
        filters.push(campFilterText + modeText);
      }
    }
    if (navigationFilters.playerPairFilter) {
      const { selectedPlayerPair, selectedPairRole } = navigationFilters.playerPairFilter;
      const pairText = selectedPlayerPair.join(' & ');
      const roleText = selectedPairRole === 'wolves' ? 'loups' : 'amoureux';
      filters.push(`Paire ${roleText}: ${pairText}`);
    }
    if (navigationFilters.multiPlayerFilter) {
      const { selectedPlayers, playersFilterMode, winnerPlayer } = navigationFilters.multiPlayerFilter;
      const playersText = selectedPlayers.join(' & ');
      let modeText = '';
      if (playersFilterMode === 'all-common-games') {
        modeText = 'toutes les parties communes';
      } else if (playersFilterMode === 'opposing-camps') {
        modeText = 'affrontements uniquement';
      } else if (playersFilterMode === 'same-camp') {
        modeText = 'parties en équipe (même camp)';
      }
      const winnerText = winnerPlayer ? ` (victoires de ${winnerPlayer})` : '';
      filters.push(`${playersText} (${modeText}${winnerText})`);
    }
    if (navigationFilters.selectedVictoryType) filters.push(`Victoire: ${navigationFilters.selectedVictoryType}`);
    if (navigationFilters.selectedHarvestRange) filters.push(`Récolte: ${navigationFilters.selectedHarvestRange}`);
    if (navigationFilters.selectedGameDuration) filters.push(`Durée: ${navigationFilters.selectedGameDuration} jour${navigationFilters.selectedGameDuration > 1 ? 's' : ''}`);
    if (navigationFilters.selectedGame) filters.push(`Partie ${navigationFilters.selectedGame}`);
    if (navigationFilters.selectedDate) {
      // Check if it's a month filter (MM/YYYY) or exact date (DD/MM/YYYY)
      if (navigationFilters.selectedDate.includes('/') && navigationFilters.selectedDate.split('/').length === 2) {
        filters.push(`Mois: ${navigationFilters.selectedDate}`);
      } else {
        filters.push(`Date: ${navigationFilters.selectedDate}`);
      }
    }
    if (navigationFilters.selectedGameIds && navigationFilters.selectedGameIds.length > 0) {
      filters.push(`${navigationFilters.selectedGameIds.length} parties sélectionnée${navigationFilters.selectedGameIds.length > 1 ? 's' : ''}`);
    }
    return filters;
  };

  if (isLoading) {
    return <div className="statistiques-chargement">Chargement des détails des parties...</div>;
  }

  if (error) {
    return <div className="statistiques-erreur">Erreur: {error}</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="lycans-empty-section">
        <h2>Aucune partie trouvée</h2>
        <p>Aucune partie ne correspond aux critères sélectionnés.</p>
        {navigationFilters.fromComponent && (
          <button 
            onClick={navigateBack}
            className="lycans-submenu-btn"
            style={{ marginTop: '1rem' }}
          >
            ← Retour à {navigationFilters.fromComponent}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="lycans-game-details">
      {/* Header with navigation and filters */}
      <div className="lycans-game-details-header">
        <div className="lycans-game-details-navigation">
          {navigationFilters.fromComponent && (
            <button 
              onClick={navigateBack}
              className="lycans-submenu-btn"
              style={{ marginRight: '1rem' }}
            >
              ← Retour à {navigationFilters.fromComponent}
            </button>
          )}
          <h2>Détails des Parties ({data.length} partie{data.length > 1 ? 's' : ''})</h2>
        </div>
        
        {getFilterSummary().length > 0 && (
          <div className="lycans-active-filters">
            <strong>Filtres actifs:</strong> {getFilterSummary().join(', ')}
          </div>
        )}
      </div>

      {/* Pagination Controls - Top */}
      {totalPages > 1 && (
        <div className="lycans-pagination-container">
          <div className="lycans-pagination-info">
            Affichage de {startIndex + 1} à {Math.min(endIndex, sortedGames.length)} sur {sortedGames.length} parties
          </div>
          
          <div className="lycans-pagination-controls">
            <select 
              value={itemsPerPage} 
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="lycans-pagination-select"
            >
              <option value={10}>10 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
            
            <div className="lycans-pagination-buttons">
              <button 
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="lycans-pagination-btn"
              >
                ««
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="lycans-pagination-btn"
              >
                ‹
              </button>
              
              <span className="lycans-pagination-current">
                Page {currentPage} sur {totalPages}
              </span>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="lycans-pagination-btn"
              >
                ›
              </button>
              <button 
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="lycans-pagination-btn"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Games Table */}
      <div className="lycans-games-table-container">
        <table className="lycans-games-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('gameId')} className="sortable">
                Partie {getSortIcon('gameId')}
              </th>
              <th onClick={() => handleSort('date')} className="sortable">
                Date {getSortIcon('date')}
              </th>
              <th onClick={() => handleSort('playerCount')} className="sortable">
                Joueurs {getSortIcon('playerCount')}
              </th>
              <th onClick={() => handleSort('gameDuration')} className="sortable">
                Durée {getSortIcon('gameDuration')}
              </th>
              <th onClick={() => handleSort('winningCamp')} className="sortable">
                Camp Vainqueur {getSortIcon('winningCamp')}
              </th>
              {showWinnerColumn && (
                <th onClick={() => handleSort('winner')} className="sortable">
                  {getWinnerColumnName()} {getSortIcon('winner')}
                </th>
              )}
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGames.map(game => (
              <>
                <tr 
                  key={game.gameId} 
                  className={`${selectedGameId === game.gameId ? 'selected' : ''} clickable-row`}
                  onClick={() => handleToggleGameDetails(game.gameId)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>#{game.gameId}</td>
                  <td>{game.date}</td>
                  <td>{game.playerCount}</td>
                  <td>{formatDuration(game.gameDuration)}</td>
                  <td style={{ 
                    color: lycansColorScheme[game.winningCamp as keyof typeof lycansColorScheme] || '#fff'
                  }}>
                    {game.winningCamp}
                  </td>
                  {showWinnerColumn && (
                    <td style={{ 
                      textAlign: 'left', 
                      fontSize: '1.2rem',
                      verticalAlign: 'middle'
                    }}>
                      {getGameWinners(game)}
                    </td>
                  )}
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when button is clicked
                        handleToggleGameDetails(game.gameId);
                      }}
                      className="lycans-details-btn"
                    >
                      {selectedGameId === game.gameId ? 'Masquer' : 'Voir'}
                    </button>
                  </td>
                </tr>
                {selectedGameId === game.gameId && (
                  <tr key={`${game.gameId}-details`} className="game-details-row">
                    <td colSpan={showWinnerColumn ? 8 : 7}>
                      <GameDetailView game={game} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="lycans-pagination-container">
          <div className="lycans-pagination-info">
            Affichage de {startIndex + 1} à {Math.min(endIndex, sortedGames.length)} sur {sortedGames.length} parties
          </div>
          
          <div className="lycans-pagination-controls">
            <div className="lycans-pagination-buttons">
              <button 
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="lycans-pagination-btn"
              >
                ««
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="lycans-pagination-btn"
              >
                ‹
              </button>
              
              <span className="lycans-pagination-current">
                Page {currentPage} sur {totalPages}
              </span>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="lycans-pagination-btn"
              >
                ›
              </button>
              <button 
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="lycans-pagination-btn"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format duration from seconds to minutes and seconds
function formatDuration(durationInSeconds: number | null): string {
  if (durationInSeconds === null || durationInSeconds <= 0) {
    return 'N/A';
  }

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}



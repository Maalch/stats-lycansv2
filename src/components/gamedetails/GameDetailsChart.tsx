import { useState, useMemo, useEffect, useRef } from 'react';
import { useGameDetailsFromRaw } from '../../hooks/useGameDetailsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { lycansColorScheme } from '../../types/api';
import './GameDetailsChart.css';

type SortField = 'date' | 'gameId' | 'playerCount' | 'gameDuration' | 'winningCamp' | 'victoryType' | 'winner';
type SortDirection = 'asc' | 'desc';

export function GameDetailsChart() {
  const { navigationFilters, navigateBack } = useNavigation();
  const { data, isLoading, error } = useGameDetailsFromRaw(navigationFilters);
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  // When the user explicitly changes page, some upstream hooks may re-create
  // the data array which would otherwise trigger the data-change effect and
  // reset the page back to 1. Use this ref to ignore the next data-change
  // reset if it was caused by a user page navigation.
  const ignoreDataResetRef = useRef(false);

  // Determine if we should show the winner column and get the target players
  const getTargetPlayers = (): string[] => {
    if (navigationFilters.selectedPlayer) {
      return [navigationFilters.selectedPlayer];
    }
    if (navigationFilters.playerPairFilter?.selectedPlayerPair) {
      return navigationFilters.playerPairFilter.selectedPlayerPair;
    }
    if (navigationFilters.multiPlayerFilter?.selectedPlayers) {
      return navigationFilters.multiPlayerFilter.selectedPlayers;
    }
    return [];
  };

  const targetPlayers = getTargetPlayers();
  const showWinnerColumn = targetPlayers.length > 0;

  // Helper function to get winners from target players for a specific game
  const getGameWinners = (game: any): string => {
    if (!showWinnerColumn) return '';
    
    const winners = game.winners ? game.winners.split(',').map((w: string) => w.trim()) : [];
    const targetWinners = winners.filter((winner: string) => 
      targetPlayers.some(player => 
        player.toLowerCase() === winner.toLowerCase()
      )
    );
    
    return targetWinners.join(', ');
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
          aValue = a.gameId;
          bValue = b.gameId;
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
        case 'victoryType':
          aValue = a.victoryType;
          bValue = b.victoryType;
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
        if (sortDirection === 'asc') {
          return a.gameId - b.gameId;
        } else {
          return b.gameId - a.gameId;
        }
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

  const handleToggleGameDetails = (gameId: number) => {
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
    if (navigationFilters.selectedGame) filters.push(`Partie #${navigationFilters.selectedGame}`);
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
              <th onClick={() => handleSort('victoryType')} className="sortable">
                Type de Victoire {getSortIcon('victoryType')}
              </th>
              {showWinnerColumn && (
                <th onClick={() => handleSort('winner')} className="sortable">
                  Vainqueur {getSortIcon('winner')}
                </th>
              )}
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGames.map(game => (
              <>
                <tr key={game.gameId} className={selectedGameId === game.gameId ? 'selected' : ''}>
                  <td>#{game.gameId}</td>
                  <td>{game.date}</td>
                  <td>{game.playerCount}</td>
                  <td>{formatDuration(game.gameDuration)}</td>
                  <td style={{ 
                    color: lycansColorScheme[game.winningCamp as keyof typeof lycansColorScheme] || '#fff'
                  }}>
                    {game.winningCamp}
                  </td>
                  <td>{game.victoryType}</td>
                  {showWinnerColumn && (
                    <td>{getGameWinners(game)}</td>
                  )}
                  <td>
                    <button
                      onClick={() => handleToggleGameDetails(game.gameId)}
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

// Component to display detailed view of a single game
function GameDetailView({ game }: { game: any }) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="lycans-game-detail-view">
      <div className="lycans-game-detail-grid">
        {/* Basic Game Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Générales</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Nombre de joueurs:</span>
              <span className="value">{game.playerCount}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Nombre de loups:</span>
              <span className="value">{game.wolfCount}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Traître:</span>
              <span className="value">{game.hasTraitor ? 'Oui' : 'Non'}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Amoureux:</span>
              <span className="value">{game.hasLovers ? 'Oui' : 'Non'}</span>
            </div>
            {game.soloRoles && (
              <div className="lycans-stat-item">
                <span className="label">Rôles solo:</span>
                <span className="value">{game.soloRoles}</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Supplémentaires</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Jours de jeu:</span>
              <span className="value">{game.dayCount}</span>
            </div>
            {game.gameDuration !== null && (
              <div className="lycans-stat-item">
                <span className="label">Durée de la partie:</span>
                <span className="value">{formatDuration(game.gameDuration)}</span>
              </div>
            )}
            {game.versions && (
              <div className="lycans-stat-item">
                <span className="label">Version:</span>
                <span className="value">
                  {game.versions}
                  {game.isModded ? ' (moddée)' : ''}
                </span>
              </div>
            )}
            {game.map && (
              <div className="lycans-stat-item">
                <span className="label">Map:</span>
                <span className="value">{game.map}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lycans-game-detail-section">
          <h4>Résultats</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Camp vainqueur:</span>
              <span className="value">{game.winningCamp}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Type de victoire:</span>
              <span className="value">{game.victoryType}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Survivants villageois:</span>
              <span className="value">{game.villagerSurvivors}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Survivants loups:</span>
              <span className="value">{game.wolfSurvivors}</span>
            </div>
            {game.loverSurvivors !== null && (
              <div className="lycans-stat-item">
                <span className="label">Survivants amoureux:</span>
                <span className="value">{game.loverSurvivors}</span>
              </div>
            )}
            {game.soloSurvivors !== null && (
              <div className="lycans-stat-item">
                <span className="label">Survivants solo:</span>
                <span className="value">{game.soloSurvivors}</span>
              </div>
            )}
            <div className="lycans-stat-item">
              <span className="label">Gagnants:</span>
              <span className="value">{game.winners}</span>
            </div>
          </div>
        </div>

        {/* Harvest (if applicable) */}
        {game.harvest !== null && (
          <div className="lycans-game-detail-section">
            <h4>Récolte</h4>
            <div className="lycans-game-detail-stats">
              <div className="lycans-stat-item">
                <span className="label">Récolte:</span>
                <span className="value">{game.harvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Total possible:</span>
                <span className="value">{game.totalHarvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Pourcentage:</span>
                <span className="value">
                  {typeof game.harvestPercentage === 'number'
                    ? (game.harvestPercentage * 100).toFixed(1) + '%'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Player Roles */}
        <div className="lycans-game-detail-section full-width">
          <h4>Rôles des Joueurs</h4>
          <div className="lycans-player-roles-grid">
            {game.playerRoles.map((playerRole: any, index: number) => {
              // Find matching player details
              //const playerDetails = game.playerDetails.find((detail: any) => detail.player === playerRole.player);
              
              // Build the display text with additional details
              let displayText = playerRole.role === playerRole.camp 
                ? playerRole.camp 
                : `${playerRole.camp} (${playerRole.role})`;
              
                /*
              if (playerDetails) {
                const additionalInfo = [];
                
                // Add wolf power or villager job
                if (playerDetails.wolfPower && playerDetails.wolfPower.trim()) {
                  additionalInfo.push(playerDetails.wolfPower);
                } else if (playerDetails.villagerJob && playerDetails.villagerJob.trim()) {
                  additionalInfo.push(playerDetails.villagerJob);
                }
                
                // Build the final display text
                if (additionalInfo.length > 0) {
                  displayText = `${playerRole.camp} - ${additionalInfo[0]}`;
                  
                  // Add secondary role in parentheses if exists
                  if (playerDetails.secondaryRole && playerDetails.secondaryRole.trim()) {
                    displayText += ` (${playerDetails.secondaryRole})`;
                  }
                } else if (playerDetails.secondaryRole && playerDetails.secondaryRole.trim()) {
                  // Only secondary role, no job/power
                  displayText = `${playerRole.camp} (${playerDetails.secondaryRole})`;
                }
              }*/
              
              return (
                <div key={index} className="lycans-player-role-item">
                  <div
                    className="lycans-player-name"
                    style={{
                      color: lycansColorScheme[playerRole.camp as keyof typeof lycansColorScheme] || '#fff',
                      textAlign: 'left'
                    }}
                  >
                    {playerRole.player}
                  </div>
                  <div
                    className="lycans-player-camp"
                    style={{ textAlign: 'left' }}
                  >
                    {displayText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Toggle Button */}
        {game.youtubeEmbedUrl && (
          <div className="lycans-game-detail-section full-width">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="lycans-video-toggle-btn"
            >
              {showVideo ? '📹 Masquer la vidéo' : '🎥 Voir la vidéo'}
            </button>
          </div>
        )}

        {/* YouTube Video */}
        {game.youtubeEmbedUrl && showVideo && (
          <div className="lycans-game-detail-section full-width">
            <h4>Vidéo de la Partie</h4>
            <div className="lycans-youtube-container">
              <iframe
                src={game.youtubeEmbedUrl}
                title={`Partie Lycans #${game.gameId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="lycans-youtube-iframe"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

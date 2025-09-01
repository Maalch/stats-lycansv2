import { useState, useMemo, useEffect, useRef } from 'react';
import { useGameDetailsFromRaw } from '../../hooks/useGameDetailsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { lycansColorScheme } from '../../types/api';
import './GameDetailsChart.css';

type SortField = 'date' | 'gameId' | 'playerCount' | 'dayCount' | 'winningCamp' | 'victoryType';
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
        case 'dayCount':
          aValue = a.dayCount;
          bValue = b.dayCount;
          break;
        case 'winningCamp':
          aValue = a.winningCamp;
          bValue = b.winningCamp;
          break;
        case 'victoryType':
          aValue = a.victoryType;
          bValue = b.victoryType;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
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
    if (navigationFilters.selectedPlayer && navigationFilters.selectedCamp) {
      filters.push(`${navigationFilters.selectedPlayer} jouant ${navigationFilters.selectedCamp}`);
    } else {
      if (navigationFilters.selectedPlayer) filters.push(`Joueur: ${navigationFilters.selectedPlayer}`);
      if (navigationFilters.selectedCamp) {
        const campFilter = `Camp: ${navigationFilters.selectedCamp}`;
        const modeText = navigationFilters.campFilterMode === 'wins-only' ? ' (victoires uniquement)' : 
                         navigationFilters.campFilterMode === 'all-assignments' ? ' (toutes assignations)' : '';
        filters.push(campFilter + modeText);
      }
    }
    if (navigationFilters.selectedPlayerPair && navigationFilters.selectedPairRole) {
      const pairText = navigationFilters.selectedPlayerPair.join(' & ');
      const roleText = navigationFilters.selectedPairRole === 'wolves' ? 'loups' : 'amoureux';
      filters.push(`Paire ${roleText}: ${pairText}`);
    }
    if (navigationFilters.selectedPlayers && navigationFilters.playersFilterMode) {
      const playersText = navigationFilters.selectedPlayers.join(' & ');
      let modeText = '';
      if (navigationFilters.playersFilterMode === 'all-common-games') {
        modeText = 'toutes les parties communes';
      } else if (navigationFilters.playersFilterMode === 'opposing-camps') {
        modeText = 'affrontements uniquement';
      } else if (navigationFilters.playersFilterMode === 'same-camp') {
        modeText = 'parties en équipe (même camp)';
      }
      const winnerText = navigationFilters.winnerPlayer ? ` (victoires de ${navigationFilters.winnerPlayer})` : '';
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
              <th onClick={() => handleSort('dayCount')} className="sortable">
                Jours {getSortIcon('dayCount')}
              </th>
              <th onClick={() => handleSort('winningCamp')} className="sortable">
                Camp Vainqueur {getSortIcon('winningCamp')}
              </th>
              <th onClick={() => handleSort('victoryType')} className="sortable">
                Type de Victoire {getSortIcon('victoryType')}
              </th>
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
                  <td>{game.dayCount}</td>
                  <td style={{ 
                    color: lycansColorScheme[game.winningCamp as keyof typeof lycansColorScheme] || '#fff'
                  }}>
                    {game.winningCamp}
                  </td>
                  <td>{game.victoryType}</td>
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
                    <td colSpan={7}>
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
              const playerDetails = game.playerDetails.find((detail: any) => detail.player === playerRole.player);
              
              // Build the display text with additional details
              let displayText = playerRole.role === playerRole.camp 
                ? playerRole.camp 
                : `${playerRole.camp} (${playerRole.role})`;
              
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
              }
              
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

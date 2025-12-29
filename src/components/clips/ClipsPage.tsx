import { useState, useMemo, useEffect } from 'react';
import { useFilteredGameLogData } from '../../hooks/useCombinedRawData';
import { ClipViewer } from '../common/ClipViewer';
import { 
  getUniqueTags, 
  findRelatedClips, 
  findNextClip,
  getClipDisplayName,
  getAllClipPlayers,
  parseOtherPlayers
} from '../../utils/clipUtils';
import type { Clip } from '../../hooks/useCombinedRawData';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import './ClipsPage.css';

// Enhanced clip type with game context
interface ClipWithGameContext extends Clip {
  gameId: string;
  gameDate: string;
  gameNumber: number;
}

type SortField = 'gameNumber' | 'date' | 'name' | 'pov' | 'players';
type SortDirection = 'asc' | 'desc';

export function ClipsPage() {
  const { data: gameData, isLoading, error } = useFilteredGameLogData();
  const { joueursData } = useJoueursData();
  const { settings } = useSettings();
  const { navigationFilters } = useNavigation();
  const [selectedClip, setSelectedClip] = useState<ClipWithGameContext | null>(null);
  
  // Build player colors mapping with theme adjustments
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('gameNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Set selected player from navigation context or highlighted player
  useEffect(() => {
    const targetPlayer = navigationFilters.selectedPlayer || settings.highlightedPlayer;
    if (targetPlayer) {
      setSelectedPlayer(targetPlayer);
    }
  }, [navigationFilters.selectedPlayer, settings.highlightedPlayer]);

  // Extract clips with game context
  const allClips = useMemo((): ClipWithGameContext[] => {
    if (!gameData) return [];
    
    const clipsWithContext: ClipWithGameContext[] = [];
    gameData.forEach(game => {
      if (game.Clips && Array.isArray(game.Clips)) {
        game.Clips.forEach(clip => {
          clipsWithContext.push({
            ...clip,
            gameId: game.DisplayedId || game.Id,
            gameDate: game.StartDate,
            gameNumber: parseInt(game.DisplayedId || game.Id, 10)
          });
        });
      }
    });
    
    return clipsWithContext;
  }, [gameData]);

  // Extract unique tags and players
  const uniqueTags = useMemo(() => {
    const allTags = getUniqueTags(allClips);
    // Filter out "Warning sonore" tags from the filter options
    return allTags.filter(tag => !tag.toLowerCase().includes('warning'));
  }, [allClips]);
  const uniquePlayers = useMemo(() => {
    const playersSet = new Set<string>();
    allClips.forEach(clip => {
      getAllClipPlayers(clip).forEach((player: string) => playersSet.add(player));
    });
    return Array.from(playersSet).sort();
  }, [allClips]);

  // Apply filters and sort
  const filteredAndSortedClips = useMemo(() => {
    let result = [...allClips];

    // Filter by selected tags
    if (selectedTags.length > 0) {
      result = result.filter(clip => 
        selectedTags.some(tag => {
          const clipTags = clip.Tags || [];
          return clipTags.some((clipTag: string) => 
            clipTag.toLowerCase() === tag.toLowerCase()
          );
        })
      );
    }

    // Filter by player
    if (selectedPlayer) {
      result = result.filter(clip => 
        getAllClipPlayers(clip).some(player => 
          player.toLowerCase() === selectedPlayer.toLowerCase()
        )
      );
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(clip => {
        const displayName = getClipDisplayName(clip).toLowerCase();
        const additionalInfo = clip.AdditionalInfo?.toLowerCase() || '';
        const clipName = clip.ClipName?.toLowerCase() || '';
        const players = getAllClipPlayers(clip).join(' ').toLowerCase();
        const gameId = clip.gameId.toLowerCase();
        
        return displayName.includes(searchLower) || 
               additionalInfo.includes(searchLower) || 
               clipName.includes(searchLower) ||
               players.includes(searchLower) ||
               gameId.includes(searchLower);
      });
    }

    // Sort clips
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'gameNumber':
          comparison = a.gameNumber - b.gameNumber;
          break;
        case 'date':
          comparison = new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
          break;
        case 'name':
          comparison = getClipDisplayName(a).localeCompare(getClipDisplayName(b));
          break;
        case 'pov':
          comparison = a.POVPlayer.localeCompare(b.POVPlayer);
          break;
        case 'players':
          const aPlayers = getAllClipPlayers(a).length;
          const bPlayers = getAllClipPlayers(b).length;
          comparison = aPlayers - bPlayers;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allClips, selectedTags, selectedPlayer, searchText, sortBy, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClips = filteredAndSortedClips.slice(startIndex, endIndex);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setSelectedTags([]);
    setSelectedPlayer('');
    setCurrentPage(1);
  };

  // Handle clip click
  const handleClipClick = (clip: ClipWithGameContext) => {
    setSelectedClip(clip);
  };

  // Handle next clip navigation
  const handleNextClip = () => {
    if (!selectedClip) return;
    const nextClipBasic = findNextClip(selectedClip, allClips);
    if (nextClipBasic) {
      const nextClip = allClips.find(c => c.ClipId === nextClipBasic.ClipId);
      if (nextClip) {
        setSelectedClip(nextClip);
      }
    }
  };

  // Handle related clip navigation
  const handleRelatedClip = (clipId: string) => {
    const related = allClips.find(c => c.ClipId === clipId);
    if (related) {
      setSelectedClip(related);
    }
  };

  // Handle random clip selection
  const handleRandomClip = () => {
    if (filteredAndSortedClips.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredAndSortedClips.length);
    const randomClip = filteredAndSortedClips[randomIndex];
    setSelectedClip(randomClip);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return '↕️';
    return sortDirection === 'asc' ? '↗️' : '↘️';
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="lycans-clips-page">
        <div className="lycans-clips-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des clips...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lycans-clips-page">
        <div className="lycans-clips-error">
          <p>Erreur lors du chargement des clips : {error}</p>
        </div>
      </div>
    );
  }

  if (allClips.length === 0) {
    return (
      <div className="lycans-clips-page">
        <div className="lycans-clips-empty">
          <div className="lycans-clips-empty-icon">🎬</div>
          <h2>Aucun clip disponible</h2>
          <p>Il n'y a actuellement aucun clip enregistré dans les parties.</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchText.trim() || selectedTags.length > 0 || selectedPlayer;

  return (
    <div className="lycans-clips-page">
      {/* Header */}
      <div className="lycans-clips-header">
        <h2>🎬 Bibliothèque de Clips</h2>
        <div className="lycans-clips-count-row">
          <p className="lycans-clips-count">
            {filteredAndSortedClips.length} clip{filteredAndSortedClips.length !== 1 ? 's' : ''} 
            {hasActiveFilters && ` sur ${allClips.length}`}
          </p>
          {filteredAndSortedClips.length > 0 && (
            <button
              className="lycans-clips-random-btn"
              onClick={handleRandomClip}
              title="Lire un clip aléatoire"
            >
              🎲 Aléatoire
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <div className="lycans-clips-filters">
        {/* Search Bar */}
        <div className="lycans-clips-search">
          <input
            type="text"
            placeholder="Rechercher par nom, description, joueur, partie..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            className="lycans-clips-search-input"
          />
          {searchText && (
            <button 
              className="lycans-clips-search-clear"
              onClick={() => {
                setSearchText('');
                setCurrentPage(1);
              }}
              title="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="lycans-clips-filter-controls">
          {/* Player Filter */}
          <div className="lycans-clips-filter-group">
            <label htmlFor="player-filter">Joueur :</label>
            <select
              id="player-filter"
              value={selectedPlayer}
              onChange={(e) => {
                setSelectedPlayer(e.target.value);
                setCurrentPage(1);
              }}
              className="lycans-clips-select"
            >
              <option value="">Tous les joueurs</option>
              {uniquePlayers.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              className="lycans-clips-clear-filters"
              onClick={clearFilters}
            >
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Tags Filter */}
        {uniqueTags.length > 0 && (
          <div className="lycans-clips-tags-filter">
            <label>Catégories :</label>
            <div className="lycans-clips-tags-list">
              {uniqueTags.map((tag: string) => (
                <button
                  key={tag}
                  className={`lycans-clips-tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <span className="tag-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No results */}
      {filteredAndSortedClips.length === 0 ? (
        <div className="lycans-clips-no-results">
          <div className="lycans-clips-no-results-icon">🔍</div>
          <h3>Aucun clip trouvé</h3>
          <p>Essayez de modifier vos filtres de recherche.</p>
          {hasActiveFilters && (
            <button
              className="lycans-clips-clear-filters-btn"
              onClick={clearFilters}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          {totalPages > 1 && (
            <div className="lycans-pagination-container">
              <div className="lycans-pagination-info">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredAndSortedClips.length)} sur {filteredAndSortedClips.length} clips
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

          {/* Clips Table */}
          <div className="lycans-clips-table-container">
            <table className="lycans-clips-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('gameNumber')} className="sortable">
                    Partie {getSortIcon('gameNumber')}
                  </th>
                  <th onClick={() => handleSort('date')} className="sortable">
                    Date {getSortIcon('date')}
                  </th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Nom {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('pov')} className="sortable">
                    POV {getSortIcon('pov')}
                  </th>
                  <th onClick={() => handleSort('players')} className="sortable">
                    Personnes impliquées {getSortIcon('players')}
                  </th>
                  <th>Tags</th>
                  <th>Voir</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClips.map(clip => {
                  const otherPlayers = parseOtherPlayers(clip.OthersPlayers);
                  const displayTags = (clip.Tags || []).filter((tag: string) => 
                    !tag.toLowerCase().includes('warning')
                  );
                  
                  return (
                    <tr 
                      key={clip.ClipId}
                      className="clickable-row"
                      onClick={() => handleClipClick(clip)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>#{clip.gameId}</td>
                      <td>{formatDate(clip.gameDate)}</td>
                      <td className="lycans-clip-name-cell">{getClipDisplayName(clip)}</td>
                      <td>
                        <span 
                          className="lycans-clip-pov-badge"
                          style={{
                            backgroundColor: playersColor[clip.POVPlayer] || 'var(--accent-primary)',
                            color: 'white'
                          }}
                        >
                          {clip.POVPlayer}
                        </span>
                      </td>
                      <td className="lycans-clip-players-cell">
                        {otherPlayers.length > 0 ? (
                          otherPlayers.map((player, idx) => (
                            <span
                              key={idx}
                              style={{
                                color: playersColor[player] || 'var(--text-secondary)',
                                fontWeight: 500
                              }}
                            >
                              {player}{idx < otherPlayers.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        ) : '-'}
                      </td>
                      <td className="lycans-clip-tags-cell">
                        {displayTags.length > 0 ? (
                          <div className="lycans-clip-tags-inline">
                            {displayTags.map((tag: string, idx: number) => (
                              <span key={idx} className="lycans-clip-tag-small">{tag}</span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClipClick(clip);
                          }}
                          className="lycans-clip-view-btn"
                        >
                          🎬 Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Bottom */}
          {totalPages > 1 && (
            <div className="lycans-pagination-container">
              <div className="lycans-pagination-info">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredAndSortedClips.length)} sur {filteredAndSortedClips.length} clips
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
        </>
      )}

      {/* Clip Viewer Modal */}
      {selectedClip && (
        <ClipViewer
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
          relatedClips={findRelatedClips(selectedClip, allClips)}
          nextClip={findNextClip(selectedClip, allClips)}
          onNextClip={handleNextClip}
          onRelatedClip={handleRelatedClip}
        />
      )}
    </div>
  );
}

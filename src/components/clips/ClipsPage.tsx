import { useState, useMemo } from 'react';
import { useAllClips } from '../../hooks/useClips';
import { ClipViewer } from '../common/ClipViewer';
import { 
  getUniqueTags, 
  filterClipsByTag, 
  filterClipsByPlayer, 
  findRelatedClips, 
  findNextClip,
  getClipDisplayName,
  getAllClipPlayers
} from '../../utils/clipUtils';
import type { Clip } from '../../hooks/useCombinedRawData';
import { useSettings } from '../../context/SettingsContext';
import './ClipsPage.css';

export function ClipsPage() {
  const { clips: allClips, isLoading, error } = useAllClips();
  const { settings } = useSettings();
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'player' | 'name'>('newest');

  // Extract unique tags and players
  const uniqueTags = useMemo(() => getUniqueTags(allClips), [allClips]);
  const uniquePlayers = useMemo(() => {
    const playersSet = new Set<string>();
    allClips.forEach(clip => {
      getAllClipPlayers(clip).forEach((player: string) => playersSet.add(player));
    });
    return Array.from(playersSet).sort();
  }, [allClips]);

  // Apply filters
  const filteredClips = useMemo(() => {
    let result = [...allClips];

    // Filter by selected tags
    if (selectedTags.length > 0) {
      result = result.filter(clip => 
        selectedTags.some(tag => filterClipsByTag(allClips, tag).includes(clip))
      );
    }

    // Filter by player
    if (selectedPlayer) {
      result = filterClipsByPlayer(result, selectedPlayer);
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(clip => {
        const displayName = getClipDisplayName(clip).toLowerCase();
        const additionalInfo = clip.AdditionalInfo?.toLowerCase() || '';
        const clipName = clip.ClipName?.toLowerCase() || '';
        const players = getAllClipPlayers(clip).join(' ').toLowerCase();
        
        return displayName.includes(searchLower) || 
               additionalInfo.includes(searchLower) || 
               clipName.includes(searchLower) ||
               players.includes(searchLower);
      });
    }

    // Sort clips
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          // Assuming ClipId contains some temporal ordering, or we could use game dates
          return b.ClipId.localeCompare(a.ClipId);
        case 'oldest':
          return a.ClipId.localeCompare(b.ClipId);
        case 'player':
          return a.POVPlayer.localeCompare(b.POVPlayer);
        case 'name':
          return getClipDisplayName(a).localeCompare(getClipDisplayName(b));
        default:
          return 0;
      }
    });

    return result;
  }, [allClips, selectedTags, selectedPlayer, searchText, sortBy]);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setSelectedTags([]);
    setSelectedPlayer('');
  };

  // Handle clip click
  const handleClipClick = (clip: Clip) => {
    setSelectedClip(clip);
  };

  // Handle next clip navigation
  const handleNextClip = () => {
    if (!selectedClip) return;
    const next = findNextClip(selectedClip, filteredClips);
    if (next) {
      setSelectedClip(next);
    }
  };

  // Handle related clip navigation
  const handleRelatedClip = (clipId: string) => {
    const related = allClips.find(c => c.ClipId === clipId);
    if (related) {
      setSelectedClip(related);
    }
  };

  if (!settings.clipsEnabled) {
    return (
      <div className="lycans-clips-page">
        <div className="lycans-clips-disabled">
          <div className="lycans-clips-disabled-icon">🎬</div>
          <h2>Clips désactivés</h2>
          <p>Cette fonctionnalité est actuellement désactivée.</p>
          <p>Ajoutez <code>?clipsEnabled=true</code> à l'URL pour l'activer.</p>
        </div>
      </div>
    );
  }

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
        <div className="lycans-clips-header-info">
          <h1>🎬 Bibliothèque de Clips</h1>
          <p className="lycans-clips-count">
            {filteredClips.length} clip{filteredClips.length !== 1 ? 's' : ''} 
            {hasActiveFilters && ` sur ${allClips.length}`}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="lycans-clips-filters">
        {/* Search Bar */}
        <div className="lycans-clips-search">
          <input
            type="text"
            placeholder="Rechercher par nom, description, joueur..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="lycans-clips-search-input"
          />
          {searchText && (
            <button 
              className="lycans-clips-search-clear"
              onClick={() => setSearchText('')}
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
            <label htmlFor="player-filter">Joueur POV :</label>
            <select
              id="player-filter"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="lycans-clips-select"
            >
              <option value="">Tous les joueurs</option>
              {uniquePlayers.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="lycans-clips-filter-group">
            <label htmlFor="sort-filter">Trier par :</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="lycans-clips-select"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="player">Joueur (A-Z)</option>
              <option value="name">Nom (A-Z)</option>
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

      {/* Clips Grid */}
      {filteredClips.length === 0 ? (
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
        <div className="lycans-clips-grid">
          {filteredClips.map((clip) => (
            <button
              key={clip.ClipId}
              className="lycans-clip-card"
              onClick={() => handleClipClick(clip)}
            >
              <div className="lycans-clip-card-header">
                <span className="lycans-clip-icon">🎬</span>
                <span className="lycans-clip-name">{getClipDisplayName(clip)}</span>
              </div>
              
              <div className="lycans-clip-card-pov">
                <span className="lycans-clip-pov-badge">POV</span>
                <span className="lycans-clip-pov-player">{clip.POVPlayer}</span>
              </div>

              {clip.Tags && clip.Tags.length > 0 && (
                <div className="lycans-clip-card-tags">
                  {clip.Tags.map((tag, idx) => (
                    <span key={idx} className="lycans-clip-card-tag">{tag}</span>
                  ))}
                </div>
              )}

              {clip.AdditionalInfo && (
                <div className="lycans-clip-card-info">
                  {clip.AdditionalInfo.length > 80 
                    ? `${clip.AdditionalInfo.substring(0, 80)}...` 
                    : clip.AdditionalInfo}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Clip Viewer Modal */}
      {selectedClip && (
        <ClipViewer
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
          relatedClips={findRelatedClips(selectedClip, allClips)}
          nextClip={findNextClip(selectedClip, filteredClips)}
          onNextClip={handleNextClip}
          onRelatedClip={handleRelatedClip}
        />
      )}
    </div>
  );
}

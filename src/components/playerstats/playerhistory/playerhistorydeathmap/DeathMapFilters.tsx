import { type DeathType, getDeathTypeLabel } from '../../../../types/deathTypes';

interface DeathMapFiltersProps {
  viewMode: 'deaths' | 'kills' | 'transformations';
  setViewMode: (mode: 'deaths' | 'kills' | 'transformations') => void;
  selectedMap: string;
  setSelectedMap: (map: string) => void;
  availableMaps: string[];
  clusterRadius: number;
  setClusterRadius: (radius: number) => void;
  availableDeathTypes: DeathType[];
  selectedDeathTypes: string[];
  setSelectedDeathTypes: React.Dispatch<React.SetStateAction<string[]>>;
  deathTypeColors: Record<string, string>;
  isDeathTypesExpanded: boolean;
  setIsDeathTypesExpanded: (expanded: boolean) => void;
}

export function DeathMapFilters({
  viewMode,
  setViewMode,
  selectedMap,
  setSelectedMap,
  availableMaps,
  clusterRadius,
  setClusterRadius,
  availableDeathTypes,
  selectedDeathTypes,
  setSelectedDeathTypes,
  deathTypeColors,
  isDeathTypesExpanded,
  setIsDeathTypesExpanded
}: DeathMapFiltersProps) {
  return (
    <div style={{ flex: '1 1 100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {/* Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Afficher :
        </label>
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('deaths')}
            style={{
              background: viewMode === 'deaths' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'deaths' ? 'white' : 'var(--text-primary)',
              border: 'none',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: viewMode === 'deaths' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            💀 Morts
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kills')}
            style={{
              background: viewMode === 'kills' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'kills' ? 'white' : 'var(--text-primary)',
              border: 'none',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: viewMode === 'kills' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            ⚔️ Kills
          </button>
          <button
            type="button"
            onClick={() => setViewMode('transformations')}
            style={{
              background: viewMode === 'transformations' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'transformations' ? 'white' : 'var(--text-primary)',
              border: 'none',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: viewMode === 'transformations' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🐺 Transfos
          </button>
        </div>
      </div>

      {/* Map Selection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="player-map-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Carte :
        </label>
        <select
          id="player-map-select"
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
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
          {availableMaps.map(map => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </select>
      </div>

      {/* Cluster Radius */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="cluster-slider" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Regroupement :
        </label>
        <input
          id="cluster-slider"
          type="range"
          min="0"
          max="50"
          step="5"
          value={clusterRadius}
          onChange={(e) => setClusterRadius(parseInt(e.target.value))}
          style={{ width: '80px' }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '60px' }}>
          {clusterRadius === 0 ? 'Aucun' : `${clusterRadius} unité${clusterRadius > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Multi-select death type filter - collapsible (hidden for transformations) */}
      {viewMode !== 'transformations' && (
        <div style={{ width: '100%', marginTop: '1rem' }}>
          {/* Clickable header to expand/collapse */}
          <div 
            onClick={() => setIsDeathTypesExpanded(!isDeathTypesExpanded)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              marginBottom: isDeathTypesExpanded ? '0.5rem' : '0',
              cursor: 'pointer',
              padding: '0.5rem',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ 
              color: 'var(--text-primary)', 
              fontSize: '1rem',
              transition: 'transform 0.2s',
              transform: isDeathTypesExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            <label style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.9rem', 
              fontWeight: 'bold',
              cursor: 'pointer',
              flexGrow: 1
            }}>
              Types de mort
            </label>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.85rem'
            }}>
              {selectedDeathTypes.length} / {availableDeathTypes.length} sélectionné{selectedDeathTypes.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Expanded content with bulk buttons and checkbox grid */}
          {isDeathTypesExpanded && (
          <>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeathTypes(availableDeathTypes);
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeathTypes([]);
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Aucun
              </button>
            </div>
            
            {/* Checkbox grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}>
              {availableDeathTypes.map(deathType => {
                const isSelected = selectedDeathTypes.includes(deathType);
                const color = deathTypeColors[deathType] || 'var(--chart-primary)';
                
                return (
                  <label
                    key={deathType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      borderRadius: '4px',
                      border: `1px solid ${isSelected ? color : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        setSelectedDeathTypes(prev => prev.filter(t => t !== deathType));
                      } else {
                        setSelectedDeathTypes(prev => [...prev, deathType]);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by label onClick
                      style={{ cursor: 'pointer' }}
                    />
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: color,
                        flexShrink: 0
                      }}
                    />
                    <span>{getDeathTypeLabel(deathType)}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
        </div>
      )}
    </div>
  );
}

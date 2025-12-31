import { useState, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerSeriesFromRaw } from '../../hooks/usePlayerSeriesFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { useSettings } from '../../context/SettingsContext';
import { FullscreenChart } from '../common/FullscreenChart';

// Extended type for chart data with highlighting info
type ChartSeriesData = {
  player: string;
  seriesLength: number;
  startGame: string;
  endGame: string;
  startDate: string;
  endDate: string;
  gameIds: string[];
  isOngoing: boolean;
  camp?: string;
  campCounts?: Record<string, number>;
  isHighlightedAddition?: boolean;
};

export function PlayerSeriesChart() {
  const { data: seriesData, isLoading: dataLoading, error: fetchError } = usePlayerSeriesFromRaw();
    const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  
  // Use navigationState to restore series type selection, fallback to 'villageois'
  const [selectedSeriesType, setSelectedSeriesType] = useState<'villageois' | 'loup' | 'nowolf' | 'solo' | 'wins' | 'losses'>(
    navigationState.selectedSeriesType || 'villageois'
  );
  // New state for view mode: 'best' (all-time best series) or 'ongoing' (current ongoing series)
  const [viewMode, setViewMode] = useState<'best' | 'ongoing'>(
    navigationState.seriesViewMode || 'best'
  );
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Helper function to handle series type changes
  const handleSeriesTypeChange = (newSeriesType: 'villageois' | 'loup' | 'nowolf' | 'solo' | 'wins' | 'losses') => {
    setSelectedSeriesType(newSeriesType);
    updateNavigationState({ selectedSeriesType: newSeriesType });
  };

  // Helper function to handle view mode changes
  const handleViewModeChange = (newViewMode: 'best' | 'ongoing') => {
    setViewMode(newViewMode);
    updateNavigationState({ seriesViewMode: newViewMode });
  };

  // Get current data based on selected type and view mode with highlighted player logic
  const { currentData, highlightedPlayerAdded, fullDataset } = useMemo(() => {
    if (!seriesData) {
      return { currentData: [], highlightedPlayerAdded: false, fullDataset: [] };
    }

    let fullDataset: any[] = [];
    
    // Select dataset based on view mode (best series vs current ongoing series)
    if (viewMode === 'ongoing') {
      // Use current ongoing series
      switch (selectedSeriesType) {
        case 'villageois':
          fullDataset = seriesData.currentVillageoisSeries;
          break;
        case 'loup':
          fullDataset = seriesData.currentLoupsSeries;
          break;
        case 'nowolf':
          fullDataset = seriesData.currentNoWolfSeries;
          break;
        case 'solo':
          fullDataset = seriesData.currentSoloSeries;
          break;
        case 'wins':
          fullDataset = seriesData.currentWinSeries;
          break;
        case 'losses':
          fullDataset = seriesData.currentLossSeries;
          break;
        default:
          fullDataset = [];
      }
    } else {
      // Use all-time best series (default)
      switch (selectedSeriesType) {
        case 'villageois':
          fullDataset = seriesData.allVillageoisSeries;
          break;
        case 'loup':
          fullDataset = seriesData.allLoupsSeries;
          break;
        case 'nowolf':
          fullDataset = seriesData.allNoWolfSeries;
          break;
        case 'solo':
          fullDataset = seriesData.allSoloSeries;
          break;
        case 'wins':
          fullDataset = seriesData.allWinSeries;
          break;
        case 'losses':
          fullDataset = seriesData.allLossSeries;
          break;
        default:
          fullDataset = [];
      }
    }

    // Get top 20 from the full dataset
    const top20Data = fullDataset.slice(0, 20);

    // Check if highlighted player is in the top 20
    const highlightedPlayerInTop20 = settings.highlightedPlayer && 
      top20Data.some(entry => entry.player === settings.highlightedPlayer);
    
    let finalData: ChartSeriesData[] = [...top20Data];
    let highlightedPlayerAddedToChart = false;
    
    // If highlighted player is not in top 20, try to find them in the full dataset
    if (settings.highlightedPlayer && !highlightedPlayerInTop20) {
      const highlightedPlayerData = fullDataset.find(entry => entry.player === settings.highlightedPlayer);
      
      if (highlightedPlayerData) {
        finalData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        } as ChartSeriesData);
        highlightedPlayerAddedToChart = true;
      }
    }

    return { 
      currentData: finalData, 
      highlightedPlayerAdded: highlightedPlayerAddedToChart,
      fullDataset: fullDataset
    };
  }, [seriesData, selectedSeriesType, viewMode, settings.highlightedPlayer]);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des séries de joueurs...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!seriesData) {
    return <div className="donnees-manquantes">Aucune donnée de série disponible</div>;
  }

  // Helper function to format camp counts for display
  const formatCampCounts = (campCounts: Record<string, number>): string => {
    return Object.entries(campCounts)
      .map(([camp, count]) => `${camp} (${count})`)
      .join(', ');
  };

  const getChartTitle = () => {
    switch (selectedSeriesType) {
      case 'villageois':
        return viewMode === 'ongoing' 
          ? 'Séries Villageois En Cours' 
          : 'Plus Longues Séries Villageois Consécutives';
      case 'loup':
        return viewMode === 'ongoing'
          ? 'Séries Loups En Cours'
          : 'Plus Longues Séries Loups Consécutives';
      case 'nowolf':
        return viewMode === 'ongoing'
          ? 'Séries Sans Rôle Loup En Cours'
          : 'Plus Longues Séries Sans Rôle Loup';
      case 'solo':
        return viewMode === 'ongoing'
          ? 'Séries Rôles Solos En Cours'
          : 'Plus Longues Séries Rôles Solos';
      case 'wins':
        return viewMode === 'ongoing'
          ? 'Séries de Victoires En Cours'
          : 'Plus Longues Séries de Victoires';
      case 'losses':
        return viewMode === 'ongoing'
          ? 'Séries de Défaites En Cours'
          : 'Plus Longues Séries de Défaites';
      default:
        return '';
    }
  };

  const getTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const isHighlightedAddition = (data as ChartSeriesData).isHighlightedAddition;
    const isHighlightedFromSettings = settings.highlightedPlayer === data.player;
    const showOngoingIndicator = viewMode === 'best' && data.isOngoing;
    
    if (selectedSeriesType === 'solo') {
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          padding: 12, 
          borderRadius: 6,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <strong>{data.player}</strong>
            {showOngoingIndicator && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série {data.camp} : {data.seriesLength} parties consécutives {showOngoingIndicator ? '(En cours)' : ''}</div>
          <div>Du {data.startGame} au {data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          {data.campCounts && (
            <div>
              <strong>Rôles joués :</strong>
              <div style={{ marginTop: '4px', fontSize: '0.9em' }}>
                {Object.entries(data.campCounts)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([role, count]: [string, any]) => (
                    <div key={role} style={{ marginLeft: '8px' }}>
                      • {role} ({count} {count > 1 ? 'fois' : 'fois'})
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence (hors top 20)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence
            </div>
          )}
          {showOngoingIndicator && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#FF8C00', 
              marginTop: '0.5rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🔥 Série en cours - Aucun jeu depuis !
            </div>
          )}
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)', 
            marginTop: '0.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    } else if (selectedSeriesType === 'wins') {
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          padding: 12, 
          borderRadius: 6,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <strong>{data.player}</strong>
            {showOngoingIndicator && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série de victoires : {data.seriesLength} parties {showOngoingIndicator ? '(En cours)' : ''}</div>
          <div>Du {data.startGame} au {data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          <div>Camps joués : {formatCampCounts(data.campCounts)}</div>
          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence (hors top 20)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence
            </div>
          )}
          {showOngoingIndicator && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#FF8C00', 
              marginTop: '0.5rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🔥 Série en cours - Aucun jeu depuis !
            </div>
          )}
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)', 
            marginTop: '0.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    } else if (selectedSeriesType === 'losses') {
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          padding: 12, 
          borderRadius: 6,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <strong>{data.player}</strong>
            {showOngoingIndicator && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série de défaites : {data.seriesLength} parties {showOngoingIndicator ? '(En cours)' : ''}</div>
          <div>Du {data.startGame} au {data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          <div>Camps joués : {formatCampCounts(data.campCounts)}</div>
          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence (hors top 20)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence
            </div>
          )}
          {showOngoingIndicator && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#FF8C00', 
              marginTop: '0.5rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🔥 Série en cours - Aucun jeu depuis !
            </div>
          )}
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)', 
            marginTop: '0.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          padding: 12, 
          borderRadius: 6,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <strong>{data.player}</strong>
            {showOngoingIndicator && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série {data.camp} : {data.seriesLength} parties consécutives {showOngoingIndicator ? '(En cours)' : ''}</div>
          <div>Du {data.startGame} au {data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          {data.campCounts && <div>Camps joués : {formatCampCounts(data.campCounts)}</div>}
          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence (hors top 20)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.5rem',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              🎯 Joueur mis en évidence
            </div>
          )}
          {showOngoingIndicator && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#FF8C00', 
              marginTop: '0.5rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🔥 Série en cours - Aucun jeu depuis !
            </div>
          )}
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)', 
            marginTop: '0.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    }
  };

  const handleBarClick = (data: any) => {
    if (selectedSeriesType === 'wins') {
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedGameIds: data.gameIds,
        fromComponent: 'Séries de Victoires'
      });
    } else if (selectedSeriesType === 'losses') {
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedGameIds: data.gameIds,
        fromComponent: 'Séries de Défaites'
      });
    } else if (selectedSeriesType === 'nowolf') {
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedGameIds: data.gameIds,
        fromComponent: 'Séries Sans Loups'
      });
    } else if (selectedSeriesType === 'solo') {
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedGameIds: data.gameIds,
        fromComponent: 'Séries Rôles Solos'
      });
    } else {
      const campFilter = selectedSeriesType === 'villageois' ? 'Villageois' : 'Loup';
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedGameIds: data.gameIds,
        campFilter: {
          selectedCamp: campFilter,
          campFilterMode: 'all-assignments'
        },
        fromComponent: `Séries ${campFilter}`
      });
    }
  };

  return (
    <div className="lycans-players-series">
      <h2>Séries des Joueurs</h2>
      <div className="lycans-section-description">
        <p>
          <strong>Mode Meilleurs Records :</strong> Affiche les meilleures séries de tous les temps pour chaque joueur.<br/>
          <strong>Mode Séries En Cours :</strong> Affiche uniquement les séries actuellement actives (tous les joueurs ayant une série en cours, pas seulement leur record personnel).<br/>
          <br/>
          {selectedSeriesType === 'villageois' && (
            <>
              <strong>Séries Villageois :</strong> Parties consécutives dans le camp Villageois. 
              Jouer dans n'importe quel autre camp brise la série.
            </>
          )}
          {selectedSeriesType === 'loup' && (
            <>
              <strong>Séries Loups :</strong> Parties consécutives dans le camp Loups. 
              Jouer dans n'importe quel autre camp brise la série.
            </>
          )}
          {selectedSeriesType === 'nowolf' && (
            <>
              <strong>Séries sans Loups :</strong> Parties consécutives où le joueur n'a PAS joué de rôle Loup. 
              Jouer un rôle Loup brise la série.
            </>
          )}
          {selectedSeriesType === 'solo' && (
            <>
              <strong>Séries Rôles Solos :</strong> Parties consécutives où le joueur a joué un rôle solo (ni Villageois ni Loup). 
              Jouer un rôle Villageois ou Loup brise la série.
            </>
          )}
          {selectedSeriesType === 'wins' && (
            <>
              <strong>Séries de victoires :</strong> Victoires consécutives dans n'importe quel camp. 
              Une défaite brise la série.
            </>
          )}
          {selectedSeriesType === 'losses' && (
            <>
              <strong>Séries de défaites :</strong> Défaites consécutives dans n'importe quel camp. 
              Une victoire brise la série.
            </>
          )}
          <br/>
          <strong>🔥 Séries en cours :</strong> {viewMode === 'ongoing' 
            ? 'Toutes les séries affichées sont actuellement actives' 
            : 'Les séries avec l\'effet de flamme sont encore actives'}
        </p>
      </div>

      {/* Series Type Selection with View Mode Toggle */}
      <div className="lycans-categories-selection" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Series Type Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'villageois' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('villageois')}
          >
            Séries Villageois
          </button>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'loup' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('loup')}
          >
            Séries Loups
          </button>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'nowolf' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('nowolf')}
          >
            Séries Sans Loups
          </button>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'solo' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('solo')}
          >
            Séries Rôles Solos
          </button>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'wins' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('wins')}
          >
            Séries de Victoires
          </button>
          <button
            type="button"
            className={`lycans-categorie-btn ${selectedSeriesType === 'losses' ? 'active' : ''}`}
            onClick={() => handleSeriesTypeChange('losses')}
          >
            Séries de Défaites
          </button>
        </div>
        
        {/* Toggle View Mode Button */}
        <button
          type="button"
          className="lycans-categorie-btn"
          onClick={() => handleViewModeChange(viewMode === 'best' ? 'ongoing' : 'best')}
          style={{ 
            marginLeft: 'auto',
            backgroundColor: viewMode === 'ongoing' ? '#FF8C00' : 'var(--accent-primary)',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {viewMode === 'best' ? '🔥 Focus Séries En Cours' : '📊 Voir les Records'}
        </button>
      </div>

      <div className="lycans-graphique-section">
        <div>
          <h3>{getChartTitle()}</h3>
          {highlightedPlayerAdded && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
            </p>
          )}
        </div>
        <FullscreenChart title={getChartTitle()}>
          <div ref={chartRef} style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={currentData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="player"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis 
                  allowDecimals={false}
                  label={{ 
                    value: selectedSeriesType === 'wins' ? 'Victoires consécutives' : 
                           selectedSeriesType === 'losses' ? 'Défaites consécutives' :
                           selectedSeriesType === 'nowolf' ? 'Parties sans Loups consécutives' :
                           selectedSeriesType === 'solo' ? 'Parties rôles solos consécutives' :
                           'Parties consécutives', 
                    angle: 270, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' } 
                  }} 
                />
                <Tooltip content={getTooltipContent} />
                <Bar
                  dataKey="seriesLength"
                  name={selectedSeriesType === 'wins' ? 'Victoires consécutives' : 
                       selectedSeriesType === 'losses' ? 'Défaites consécutives' :
                       selectedSeriesType === 'solo' ? 'Parties rôles solos consécutives' : 
                       'Parties consécutives'}
                  fill={selectedSeriesType === 'villageois' ? '#82ca9d' : 
                       selectedSeriesType === 'loup' ? '#FF8042' : 
                       selectedSeriesType === 'nowolf' ? '#FFA500' :
                       selectedSeriesType === 'solo' ? '#9C27B0' : 
                       selectedSeriesType === 'wins' ? '#8884d8' : 
                       '#dc3545'}
                >
                  {currentData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                    const isHoveredPlayer = hoveredPlayer === entry.player;
                    const isHighlightedAddition = (entry as ChartSeriesData).isHighlightedAddition;
                    
                    // Get the player's base color first
                    const baseColor = playersColor[entry.player] || 
                      (selectedSeriesType === 'villageois' ? '#82ca9d' : 
                       selectedSeriesType === 'loup' ? '#FF8042' : 
                       selectedSeriesType === 'nowolf' ? '#FFA500' :
                       selectedSeriesType === 'solo' ? '#9C27B0' : 
                       selectedSeriesType === 'wins' ? '#8884d8' : 
                       '#dc3545');
                    
                    return (
                      <Cell
                        key={`cell-${selectedSeriesType}-${index}`}
                        fill={baseColor}
                        stroke={
                          isHighlightedFromSettings 
                            ? "var(--accent-primary)" 
                            : isHoveredPlayer 
                              ? "var(--text-primary)" 
                              : "none"
                        }
                        strokeWidth={
                          isHighlightedFromSettings 
                            ? 3 
                            : isHoveredPlayer 
                              ? 2 
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onClick={() => handleBarClick(entry)}
                        onMouseEnter={() => setHoveredPlayer(entry.player)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                        className={viewMode === 'best' && entry.isOngoing ? 'lycans-ongoing-series' : ''}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>

        {currentData.length > 0 && (() => {
          // Find all players tied for the record
          const maxSeriesLength = currentData[0].seriesLength;
          const tiedPlayers = currentData.filter(entry => entry.seriesLength === maxSeriesLength);
          const hasOngoingSeries = tiedPlayers.some(p => p.isOngoing);
          
          return (
            <div className="lycans-stats-grid" style={{ marginTop: '0rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div className="lycans-stat-card">
                <h3>{viewMode === 'ongoing' ? '🔥 Plus Longue Série Active' : '🏆 Record Absolu'}</h3>
                <div className="lycans-stat-value">
                  {maxSeriesLength}
                  {viewMode === 'ongoing' && <span style={{ fontSize: '0.6em', marginLeft: '5px' }}>🔥</span>}
                  {viewMode === 'best' && hasOngoingSeries && <span style={{ fontSize: '0.6em', marginLeft: '5px' }}>🔥</span>}
                </div>
                {tiedPlayers.length === 1 ? (
                  <>
                    <p>
                      par <strong>{tiedPlayers[0].player}</strong>
                      {viewMode === 'best' && tiedPlayers[0].isOngoing && <span style={{ color: '#FF8C00', fontWeight: 'bold' }}> (En cours)</span>}
                    </p>
                    {(tiedPlayers[0] as any).campCounts ? (
                      <p className="lycans-h2h-description">
                        Camps joués : {formatCampCounts((tiedPlayers[0] as any).campCounts)}
                      </p>
                    ) : (
                      <p className="lycans-h2h-description">
                        Camp : {(tiedPlayers[0] as any).camp}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      par <strong>{tiedPlayers.length} joueurs</strong>
                      {viewMode === 'best' && hasOngoingSeries && <span style={{ color: '#FF8C00', fontWeight: 'bold' }}> (dont série{tiedPlayers.filter(p => p.isOngoing).length > 1 ? 's' : ''} en cours)</span>}
                    </p>
                    <p className="lycans-h2h-description" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {tiedPlayers.map((player, idx) => (
                        <span key={player.player}>
                          <strong>{player.player}</strong>
                          {viewMode === 'best' && player.isOngoing && <span style={{ fontSize: '0.9em' }}>🔥</span>}
                          {idx < tiedPlayers.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </>
                )}
              </div>
            
            {viewMode === 'best' ? (
              <>
                <div className="lycans-stat-card">
                  <h3>📊 Meilleure série moyenne (tous les joueurs)</h3>
                  <div className="lycans-stat-value">
                    {selectedSeriesType === 'villageois' ? seriesData.averageVillageoisSeries :
                     selectedSeriesType === 'loup' ? seriesData.averageLoupsSeries :
                     selectedSeriesType === 'nowolf' ? seriesData.averageNoWolfSeries :
                     selectedSeriesType === 'solo' ? seriesData.averageSoloSeries :
                     selectedSeriesType === 'wins' ? seriesData.averageWinSeries :
                     seriesData.averageLossSeries}
                  </div>
                  <p>parties en moyenne</p>
                  <p className="lycans-h2h-description">
                    Basé sur {seriesData.totalPlayersCount} joueurs
                  </p>
                </div>
                
                <div className="lycans-stat-card">
                  <h3>🔥 Séries En Cours</h3>
                  <div className="lycans-stat-value">
                    {selectedSeriesType === 'villageois' ? seriesData.activeVillageoisCount :
                     selectedSeriesType === 'loup' ? seriesData.activeLoupsCount :
                     selectedSeriesType === 'nowolf' ? seriesData.activeNoWolfCount :
                     selectedSeriesType === 'solo' ? seriesData.activeSoloCount :
                     selectedSeriesType === 'wins' ? seriesData.activeWinCount :
                     seriesData.activeLossCount}
                  </div>
                  <p>séries encore actives</p>
                  <p className="lycans-h2h-description">
                    {(selectedSeriesType === 'villageois' ? seriesData.activeVillageoisCount :
                      selectedSeriesType === 'loup' ? seriesData.activeLoupsCount :
                      selectedSeriesType === 'nowolf' ? seriesData.activeNoWolfCount :
                      selectedSeriesType === 'solo' ? seriesData.activeSoloCount :
                      selectedSeriesType === 'wins' ? seriesData.activeWinCount :
                      seriesData.activeLossCount) > 0 ? 
                      'Joueurs actuellement dans une série de ce type' : 
                      'Aucune série active de ce type'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="lycans-stat-card">
                  <h3>📊 Série active moyenne</h3>
                  <div className="lycans-stat-value">
                    {fullDataset.length > 0 
                      ? (fullDataset.reduce((sum, s) => sum + s.seriesLength, 0) / fullDataset.length).toFixed(1)
                      : '0'}
                  </div>
                  <p>parties en moyenne</p>
                  <p className="lycans-h2h-description">
                    Basé sur {fullDataset.length} joueur{fullDataset.length > 1 ? 's' : ''} en série active
                  </p>
                </div>
                
                <div className="lycans-stat-card">
                  <h3>👥 Joueurs Actifs</h3>
                  <div className="lycans-stat-value">
                    {fullDataset.length}
                  </div>
                  <p>joueur{fullDataset.length > 1 ? 's' : ''} en série active</p>
                  <p className="lycans-h2h-description">
                    {fullDataset.length > 0 
                      ? `Sur ${seriesData.totalPlayersCount} joueurs au total`
                      : 'Aucun joueur en série active'}
                  </p>
                </div>
              </>
            )}
          </div>
          );
        })()}

        {currentData.length === 0 && (
          <div className="lycans-empty-section">
            <h3>Aucune série trouvée</h3>
            <p>Aucune série n'a été trouvée pour ce type avec les filtres actuels.</p>
          </div>
        )}
      </div>
    </div>
  );
}

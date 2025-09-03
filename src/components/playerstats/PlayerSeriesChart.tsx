import { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerSeriesFromRaw } from '../../hooks/usePlayerSeriesFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { playersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function PlayerSeriesChart() {
  const { data: seriesData, isLoading: dataLoading, error: fetchError } = usePlayerSeriesFromRaw();
  const { navigateToGameDetails } = useNavigation();
  const [selectedSeriesType, setSelectedSeriesType] = useState<'villageois' | 'loups' | 'wins'>('villageois');
  const chartRef = useRef<HTMLDivElement>(null);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des séries de joueurs...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!seriesData) {
    return <div className="donnees-manquantes">Aucune donnée de série disponible</div>;
  }

  // Get current data based on selected type
  const getCurrentData = () => {
    switch (selectedSeriesType) {
      case 'villageois':
        return seriesData.longestVillageoisSeries.slice(0, 20);
      case 'loups':
        return seriesData.longestLoupsSeries.slice(0, 20);
      case 'wins':
        return seriesData.longestWinSeries.slice(0, 20);
      default:
        return [];
    }
  };

  const currentData = getCurrentData();

  // Helper function to format camp counts for display
  const formatCampCounts = (campCounts: Record<string, number>): string => {
    return Object.entries(campCounts)
      .map(([camp, count]) => `${camp} (${count})`)
      .join(', ');
  };

  const getChartTitle = () => {
    switch (selectedSeriesType) {
      case 'villageois':
        return 'Plus Longues Séries Villageois Consécutives';
      case 'loups':
        return 'Plus Longues Séries Loups Consécutives';
      case 'wins':
        return 'Plus Longues Séries de Victoires';
      default:
        return '';
    }
  };

  const getTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    
    if (selectedSeriesType === 'wins') {
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
            {data.isOngoing && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série de victoires : {data.seriesLength} parties {data.isOngoing ? '(En cours)' : ''}</div>
          <div>Du jeu #{data.startGame} au jeu #{data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          <div>Camps joués : {formatCampCounts(data.campCounts)}</div>
          {data.isOngoing && (
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
            {data.isOngoing && <span style={{ marginLeft: '8px', fontSize: '1.2em' }}>🔥</span>}
          </div>
          <div>Série {data.camp} : {data.seriesLength} parties consécutives {data.isOngoing ? '(En cours)' : ''}</div>
          <div>Du jeu #{data.startGame} au jeu #{data.endGame}</div>
          <div>Du {data.startDate} au {data.endDate}</div>
          {data.isOngoing && (
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
        fromComponent: 'Séries de Victoires'
      });
    } else {
      const campFilter = selectedSeriesType === 'villageois' ? 'Villageois' : 'Loups';
      navigateToGameDetails({
        selectedPlayer: data.player,
        selectedCamp: campFilter,
        fromComponent: `Séries ${campFilter}`
      });
    }
  };

  return (
    <div className="lycans-players-series">
      <h2>Séries des Joueurs</h2>
      <p className="lycans-stats-info">
        Basé sur {seriesData.totalGamesAnalyzed} parties analysées
      </p>
      {seriesData.lastRecordedGameDate && (
        <div style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          margin: '1rem 0',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)', 
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            📅 <strong>Données à jour jusqu'au :</strong> {seriesData.lastRecordedGameDate}
          </p>
        </div>
      )}
      
      <div className="lycans-section-description">
        <p>
          <strong>Séries de camps :</strong> Parties consécutives dans le même camp principal (Villageois ou Loups). 
          Jouer dans n'importe quel autre camp brise la série.<br/>
          <strong>Séries de victoires :</strong> Victoires consécutives dans n'importe quel camp. 
          Une défaite brise la série.<br/>
          <strong>🔥 Séries en cours :</strong> Les séries avec l'effet de flamme sont encore actives
        </p>
      </div>

      {/* Series Type Selection */}
      <div className="lycans-categories-selection">
        <button
          className={`lycans-categorie-btn ${selectedSeriesType === 'villageois' ? 'active' : ''}`}
          onClick={() => setSelectedSeriesType('villageois')}
        >
          Séries Villageois
        </button>
        <button
          className={`lycans-categorie-btn ${selectedSeriesType === 'loups' ? 'active' : ''}`}
          onClick={() => setSelectedSeriesType('loups')}
        >
          Séries Loups
        </button>
        <button
          className={`lycans-categorie-btn ${selectedSeriesType === 'wins' ? 'active' : ''}`}
          onClick={() => setSelectedSeriesType('wins')}
        >
          Séries de Victoires
        </button>
      </div>

      <div className="lycans-graphique-section">
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
                />
                <YAxis 
                  label={{ 
                    value: selectedSeriesType === 'wins' ? 'Victoires consécutives' : 'Parties consécutives', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }} 
                />
                <Tooltip content={getTooltipContent} />
                <Bar
                  dataKey="seriesLength"
                  name={selectedSeriesType === 'wins' ? 'Victoires consécutives' : 'Parties consécutives'}
                  fill={selectedSeriesType === 'villageois' ? '#82ca9d' : selectedSeriesType === 'loups' ? '#FF8042' : '#8884d8'}
                >
                  {currentData.map((entry, index) => (
                    <Cell
                      key={`cell-${selectedSeriesType}-${index}`}
                      fill={playersColor[entry.player] || (selectedSeriesType === 'villageois' ? '#82ca9d' : selectedSeriesType === 'loups' ? '#FF8042' : '#8884d8')}
                      onClick={() => handleBarClick(entry)}
                      style={{ cursor: 'pointer' }}
                      className={entry.isOngoing ? 'lycans-ongoing-series' : ''}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>

        {currentData.length > 0 && (
          <div className="lycans-stats-grid" style={{ marginTop: '0rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="lycans-stat-card">
              <h3>🏆 Record Absolu</h3>
              <div className="lycans-stat-value">
                {currentData[0].seriesLength}
                {currentData[0].isOngoing && <span style={{ fontSize: '0.6em', marginLeft: '5px' }}>🔥</span>}
              </div>
              <p>
                par <strong>{currentData[0].player}</strong>
                {currentData[0].isOngoing && <span style={{ color: '#FF8C00', fontWeight: 'bold' }}> (En cours)</span>}
              </p>
              {selectedSeriesType === 'wins' ? (
                <p className="lycans-h2h-description">
                  Camps : {formatCampCounts((currentData[0] as any).campCounts || {})}
                </p>
              ) : (
                <p className="lycans-h2h-description">
                  Camp : {(currentData[0] as any).camp}
                </p>
              )}
            </div>
            
            <div className="lycans-stat-card">
              <h3>📊 Moyenne (tous les joueurs)</h3>
              <div className="lycans-stat-value">
                {selectedSeriesType === 'villageois' ? seriesData.averageVillageoisSeries :
                 selectedSeriesType === 'loups' ? seriesData.averageLoupsSeries :
                 seriesData.averageWinSeries}
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
                 selectedSeriesType === 'loups' ? seriesData.activeLoupsCount :
                 seriesData.activeWinCount}
              </div>
              <p>séries encore actives</p>
              <p className="lycans-h2h-description">
                {(selectedSeriesType === 'villageois' ? seriesData.activeVillageoisCount :
                  selectedSeriesType === 'loups' ? seriesData.activeLoupsCount :
                  seriesData.activeWinCount) > 0 ? 
                  'Joueurs actuellement dans une série de ce type' : 
                  'Aucune série active de ce type'}
              </p>
            </div>
          </div>
        )}

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

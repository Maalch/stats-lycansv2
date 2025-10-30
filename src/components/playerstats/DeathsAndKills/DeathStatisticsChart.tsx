import { useMemo, useState, useEffect } from 'react';
import { useDeathStatisticsFromRaw, useAvailableCampsFromRaw, useHunterStatisticsFromRaw } from '../../../hooks/useDeathStatisticsFromRaw';
import { useSurvivalStatisticsFromRaw } from '../../../hooks/useSurvivalStatisticsFromRaw';
import { getAllDeathTypes } from '../../../hooks/utils/deathStatisticsUtils';
import { DeathTypeCode, type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { useFilteredGameLogData } from '../../../hooks/useCombinedRawData';

import { useNavigation } from '../../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme } from '../../../types/api';
import { KillersView } from './KillersView';
import { DeathsView } from './DeathsView';
import { HunterView } from './HunterView';
import { SurvivalView } from './SurvivalView';

export function DeathStatisticsChart() {
  const { navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathStatisticsState?.selectedCamp || 
    navigationState.deathStatsSelectedCamp || 
    'Tous les camps'
  );
  const [minGamesForAverage, setMinGamesForAverage] = useState<number>(
    navigationState.deathStatisticsState?.minGamesForAverage || 25
  );
  const [selectedView, setSelectedView] = useState<'killers' | 'deaths' | 'hunter' | 'survival'>(
    navigationState.deathStatisticsState?.selectedView || 'killers'
  );
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw(selectedCamp);
  // Hunter stats always use all camps data (no camp filter)
  const { data: hunterStats, isLoading: hunterLoading, error: hunterError } = useHunterStatisticsFromRaw();
  // Survival stats use camp filter
  const { data: survivalStats, isLoading: survivalLoading, error: survivalError } = useSurvivalStatisticsFromRaw(selectedCamp);
  const { data: gameLogData } = useFilteredGameLogData();

  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Save state to navigation context when it changes (for back/forward navigation persistence)
  useEffect(() => {
    // Only update if state differs from navigation state
    if (!navigationState.deathStatisticsState || 
        navigationState.deathStatisticsState.selectedCamp !== selectedCamp ||
        navigationState.deathStatisticsState.minGamesForAverage !== minGamesForAverage ||
        navigationState.deathStatisticsState.selectedView !== selectedView) {
      updateNavigationState({
        deathStatisticsState: {
          selectedCamp,
          minGamesForAverage,
          selectedView,
          focusChart: navigationState.deathStatisticsState?.focusChart // Preserve focus chart from achievement navigation
        }
      });
    }
  }, [selectedCamp, minGamesForAverage, selectedView, navigationState.deathStatisticsState, updateNavigationState]);

  // Get all unique death types for chart configuration
  const availableDeathTypes = useMemo(() => {
    return gameLogData ? getAllDeathTypes(gameLogData) : [];
  }, [gameLogData]);

  // Define colors for different death types
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<DeathTypeCodeType, string> = {} as Record<DeathTypeCodeType, string>;
    
    // Map death type codes to colors directly
    // Note: SURVIVALIST_NOT_SAVED is now merged with BY_WOLF, so it won't appear separately
    availableDeathTypes.forEach(deathTypeCode => {
      if (deathTypeCode === DeathTypeCode.BY_WOLF) {
        colorMap[deathTypeCode] = lycansColors['Loup'];
      } else if (deathTypeCode === DeathTypeCode.VOTED) {
        colorMap[deathTypeCode] = 'var(--chart-color-1)';
      } else if (deathTypeCode === DeathTypeCode.BULLET || deathTypeCode === DeathTypeCode.BULLET_HUMAN || deathTypeCode === DeathTypeCode.BULLET_WOLF) {
        colorMap[deathTypeCode] = lycansColors['Chasseur'];
      } else if (deathTypeCode === DeathTypeCode.BY_ZOMBIE) {
        colorMap[deathTypeCode] = lycansColors['Vaudou'];
      } else if (deathTypeCode === DeathTypeCode.ASSASSIN) {
        colorMap[deathTypeCode] = lycansColors['Alchimiste'];
      } else if (deathTypeCode === DeathTypeCode.AVENGER) {
        colorMap[deathTypeCode] = 'var(--chart-color-2)';
      } else if (deathTypeCode === DeathTypeCode.LOVER_DEATH) {
        colorMap[deathTypeCode] = lycansColors['Amoureux'];
      } else if (deathTypeCode === DeathTypeCode.BY_BEAST) {
        colorMap[deathTypeCode] = 'var(--chart-color-3)';
      } else if (deathTypeCode === DeathTypeCode.SHERIF_SUCCESS) {
        colorMap[deathTypeCode] = 'var(--chart-color-4)';
      }
    });
    
    // Assign colors to any death types that don't have specific colors yet
    const additionalColors = [
      'var(--accent-primary)',
      'var(--accent-secondary)',
      'var(--accent-tertiary)',
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#ffbb28'
    ];
    
    let colorIndex = 0;
    availableDeathTypes.forEach(deathTypeCode => {
      if (!colorMap[deathTypeCode]) {
        colorMap[deathTypeCode] = additionalColors[colorIndex % additionalColors.length];
        colorIndex++;
      }
    });
    
    return colorMap;
  }, [availableDeathTypes, lycansColors]);

  // Function to handle camp selection change with persistence
  const handleCampChange = (newCamp: string) => {
    setSelectedCamp(newCamp);
    updateNavigationState({ 
      deathStatsSelectedCamp: newCamp,
      deathStatisticsState: {
        selectedCamp: newCamp,
        minGamesForAverage,
        selectedView,
        focusChart: navigationState.deathStatisticsState?.focusChart // Preserve focus chart
      }
    });
  };

  // Function to handle minimum games change with persistence
  const handleMinGamesChange = (newMinGames: number) => {
    setMinGamesForAverage(newMinGames);
    updateNavigationState({
      deathStatisticsState: {
        selectedCamp,
        minGamesForAverage: newMinGames,
        selectedView,
        focusChart: navigationState.deathStatisticsState?.focusChart // Preserve focus chart
      }
    });
  };

  // Function to handle view change with persistence
  const handleViewChange = (newView: 'killers' | 'deaths' | 'hunter' | 'survival') => {
    setSelectedView(newView);
    updateNavigationState({
      deathStatisticsState: {
        selectedCamp,
        minGamesForAverage,
        selectedView: newView,
        focusChart: navigationState.deathStatisticsState?.focusChart // Preserve focus chart
      }
    });
  };

  // Calculate summary data for the main component
  const { gamesWithKillers, totalEligibleForAverage } = useMemo(() => {
    if (!deathStats) return { 
      gamesWithKillers: 0,
      totalEligibleForAverage: 0
    };
    
    const eligibleForAverage = deathStats.killerStats.filter((killer: any) => killer.gamesPlayed >= minGamesForAverage);
    
    return { 
      gamesWithKillers: deathStats.totalGames,
      totalEligibleForAverage: eligibleForAverage.length
    };
  }, [deathStats, minGamesForAverage]);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!deathStats) return <div className="donnees-manquantes">Aucune donnée de mort disponible</div>;

  return (
    <div className="lycans-players-stats">
      <h2>💀 Statistiques de Morts & Kills</h2>

      {/* View Selection */}
      <div className="lycans-categories-selection">
        <button
          className={`lycans-categorie-btn ${selectedView === 'killers' ? 'active' : ''}`}
          onClick={() => handleViewChange('killers')}
        >
          Tueurs
        </button>
        <button
          className={`lycans-categorie-btn ${selectedView === 'deaths' ? 'active' : ''}`}
          onClick={() => handleViewChange('deaths')}
        >
          Morts
        </button>
        <button
          className={`lycans-categorie-btn ${selectedView === 'survival' ? 'active' : ''}`}
          onClick={() => handleViewChange('survival')}
        >
          Survie
        </button>
        <button
          className={`lycans-categorie-btn ${selectedView === 'hunter' ? 'active' : ''}`}
          onClick={() => handleViewChange('hunter')}
        >
          Chasseur
        </button>
      </div>

      {/* Camp Filter - Only visible for Tueurs, Morts, and Survie views */}
      {(selectedView === 'killers' || selectedView === 'deaths' || selectedView === 'survival') && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Camp :
          </label>
          <select
            id="camp-select"
            value={selectedCamp}
            onChange={(e) => handleCampChange(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="Tous les camps">Tous les camps</option>
            {availableCamps?.map(camp => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary statistics using lycans styling - Only visible for Tueurs and Morts views */}
      {(selectedView === 'killers' || selectedView === 'deaths') && (
        <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
          <div className="lycans-stat-carte">
            <h3>Total des morts</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
              {deathStats.totalDeaths}
            </div>
          </div>
          <div className="lycans-stat-carte">
            <h3>Tueurs identifiés</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
              {deathStats.killerStats.length}
            </div>
          </div>
          <div className="lycans-stat-carte">
            <h3>Nombre de parties enregistrées</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
              {gamesWithKillers}
            </div>
          </div>
        </div>
      )}

      {/* Killers View */}
      {selectedView === 'killers' && (
        <KillersView
          deathStats={deathStats}
          selectedCamp={selectedCamp}
          minGamesForAverage={minGamesForAverage}
          onMinGamesChange={handleMinGamesChange}
          availableDeathTypes={availableDeathTypes}
          deathTypeColors={deathTypeColors}
          totalEligibleForAverage={totalEligibleForAverage}
        />
      )}

      {/* Deaths View */}
      {selectedView === 'deaths' && (
        <DeathsView
          deathStats={deathStats}
          selectedCamp={selectedCamp}
          minGamesForAverage={minGamesForAverage}
          onMinGamesChange={handleMinGamesChange}
          availableDeathTypes={availableDeathTypes}
          deathTypeColors={deathTypeColors}
        />
      )}

      {/* Hunter View */}
      {selectedView === 'hunter' && (
        <HunterView
          hunterStats={hunterStats}
          isLoading={hunterLoading}
          error={hunterError}
        />
      )}

      {/* Survival View */}
      {selectedView === 'survival' && (
        <SurvivalView
          survivalStats={survivalStats}
          selectedCamp={selectedCamp}
          minGamesForAverage={minGamesForAverage}
          onMinGamesChange={handleMinGamesChange}
          isLoading={survivalLoading}
          error={survivalError}
        />
      )}

      {/* Insights section using lycans styling */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>Note : </strong> 
          {`Données en cours de récupération (données partielles).`}
        </p>
      </div>
    </div>
  );
}
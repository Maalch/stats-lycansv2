import { useMemo, useState, useEffect } from 'react';
import { useFilteredGameLogData } from '../../hooks/useCombinedRawData';
import { useNavigation } from '../../context/NavigationContext';
import { getAllDeathTypes } from '../../hooks/utils/deathStatisticsUtils';
import { DeathTypeCode, type DeathTypeCodeType } from '../../utils/datasyncExport';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';
import { DeathLocationView } from './DeathLocationView';
import { useAvailableCampsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';

export function DeathLocationHeatmap() {
  const { navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathLocationState?.selectedCamp || 'Tous les camps'
  );
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: gameLogData } = useFilteredGameLogData();
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Save state to navigation context when it changes
  useEffect(() => {
    if (!navigationState.deathLocationState || 
        navigationState.deathLocationState.selectedCamp !== selectedCamp) {
      updateNavigationState({
        deathLocationState: {
          selectedCamp
        }
      });
    }
  }, [selectedCamp, navigationState.deathLocationState, updateNavigationState]);

  // Get all unique death types for chart configuration
  const availableDeathTypes = useMemo(() => {
    return gameLogData ? getAllDeathTypes(gameLogData) : [];
  }, [gameLogData]);

  // Define colors for different death types
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<DeathTypeCodeType, string> = {} as Record<DeathTypeCodeType, string>;
    
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
      deathLocationState: {
        selectedCamp: newCamp
      }
    });
  };

  return (
    <div className="lycans-general-stats">
      <h2>🗺️ Carte de Chaleur des Morts</h2>

      {/* Camp Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            {availableCamps?.map(camp => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Death Location View */}
      <DeathLocationView
        selectedCamp={selectedCamp}
        availableDeathTypes={availableDeathTypes}
        deathTypeColors={deathTypeColors}
      />
    </div>
  );
}

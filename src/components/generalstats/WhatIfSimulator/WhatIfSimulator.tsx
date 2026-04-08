import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWhatIfSimulator } from '../../../hooks/useWhatIfSimulator';
import { useNavigation } from '../../../context/NavigationContext';
import { computePlayerModifiers } from '../../../hooks/utils/whatIfModelUtils';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { FullscreenChart } from '../../common/FullscreenChart';
import { TeamBuilder } from './TeamBuilder';
import { PredictionDisplay } from './PredictionDisplay';
import { NearestMatchesPanel } from './NearestMatchesPanel';
import type { SimulatorSlot, SimulatorConfiguration, CampType } from '../../../types/whatIfSimulator';
import './WhatIfSimulator.css';

function createDefaultSlots(): SimulatorSlot[] {
  // Default: 15 players — 9 Villageois, 3 Loups, 3 Solo
  const slots: SimulatorSlot[] = [];
  for (let i = 0; i < 9; i++) slots.push({ camp: 'Villageois' });
  for (let i = 0; i < 3; i++) slots.push({ camp: 'Loup' });
  for (let i = 0; i < 3; i++) slots.push({ camp: 'Solo' });
  return slots;
}

export function WhatIfSimulator() {
  const { navigationState, updateNavigationState } = useNavigation();
  const { model, predict, isLoading, error } = useWhatIfSimulator();
  const { gameData } = useCombinedFilteredRawData();

  const moddedGameData = useMemo(() => gameData?.filter(g => g.Modded) ?? [], [gameData]);

  // Restore state from NavigationContext
  const savedState = navigationState.whatIfSimulatorState;

  const [playerCount, setPlayerCount] = useState<number>(
    savedState?.playerCount ?? 15
  );
  const [slots, setSlots] = useState<SimulatorSlot[]>(
    savedState?.slots ?? createDefaultSlots()
  );

  // Persist state to NavigationContext
  useEffect(() => {
    updateNavigationState({
      whatIfSimulatorState: { playerCount, slots },
    });
  }, [playerCount, slots, updateNavigationState]);

  // Adjust slots when player count changes
  const handlePlayerCountChange = useCallback((newCount: number) => {
    if (newCount < 8 || newCount > 15) return;
    const diff = newCount - playerCount;
    setPlayerCount(newCount);

    if (diff > 0) {
      // Add villageois slots
      const newSlots = [...slots];
      for (let i = 0; i < diff; i++) newSlots.push({ camp: 'Villageois' as CampType });
      setSlots(newSlots);
    } else if (diff < 0) {
      // Remove unassigned villageois slots first, then others
      const newSlots = [...slots];
      let toRemove = Math.abs(diff);
      while (toRemove > 0 && newSlots.length > 1) {
        const idx = newSlots.findLastIndex(s => s.camp === 'Villageois' && !s.role && !s.player);
        if (idx >= 0) {
          newSlots.splice(idx, 1);
        } else {
          // Remove last unassigned slot
          const anyIdx = newSlots.findLastIndex(s => !s.role && !s.player);
          if (anyIdx >= 0) {
            newSlots.splice(anyIdx, 1);
          } else {
            newSlots.pop();
          }
        }
        toRemove--;
      }
      setSlots(newSlots);
    }
  }, [playerCount, slots]);

  // Build configuration
  const config: SimulatorConfiguration = useMemo(() => ({
    playerCount,
    slots,
  }), [playerCount, slots]);

  // Compute prediction
  const prediction = useMemo(() => predict(config), [predict, config]);

  // Compute player modifiers for display
  const playerModifiers = useMemo(() => {
    if (moddedGameData.length === 0) return [];
    return computePlayerModifiers(config, moddedGameData);
  }, [config, moddedGameData]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <FullscreenChart title="Simulateur What-If">
      <div className="whatif-simulator">
        {/* Player Count */}
        <div className="whatif-player-count">
          <label>Nombre de joueurs :</label>
          <div className="whatif-count-controls">
            <button
              type="button"
              className="whatif-count-btn"
              disabled={playerCount <= 8}
              onClick={() => handlePlayerCountChange(playerCount - 1)}
            >
              −
            </button>
            <span className="whatif-count-value">{playerCount}</span>
            <button
              type="button"
              className="whatif-count-btn"
              disabled={playerCount >= 15}
              onClick={() => handlePlayerCountChange(playerCount + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Team Builder */}
        <TeamBuilder
          playerCount={playerCount}
          slots={slots}
          onSlotsChange={setSlots}
        />

        {/* Prediction */}
        <PredictionDisplay
          prediction={prediction}
          model={model}
          playerModifiers={playerModifiers}
        />

        {/* Nearest Matches */}
        {prediction && (
          <NearestMatchesPanel matches={prediction.nearestMatches} />
        )}
      </div>
    </FullscreenChart>
  );
}

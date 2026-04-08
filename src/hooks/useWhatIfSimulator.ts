import { useMemo, useCallback } from 'react';
import { useCombinedFilteredRawData } from './useCombinedRawData';
import { trainModel, computePrediction } from './utils/whatIfModelUtils';
import type { SimulatorConfiguration, PredictionResult, TrainedModel } from '../types/whatIfSimulator';

export interface WhatIfSimulatorResult {
  model: TrainedModel | null;
  predict: (config: SimulatorConfiguration) => PredictionResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useWhatIfSimulator(): WhatIfSimulatorResult {
  const { gameData, isLoading, error } = useCombinedFilteredRawData();

  const moddedGameData = useMemo(() => gameData?.filter(g => g.Modded) ?? [], [gameData]);

  const model = useMemo(() => {
    if (moddedGameData.length === 0) return null;
    return trainModel(moddedGameData);
  }, [moddedGameData]);

  const predictFn = useCallback(
    (config: SimulatorConfiguration): PredictionResult | null => {
      if (!model || moddedGameData.length === 0) return null;
      return computePrediction(model, config, moddedGameData);
    },
    [model, moddedGameData],
  );

  return {
    model,
    predict: predictFn,
    isLoading,
    error,
  };
}

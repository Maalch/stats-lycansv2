import { useGameStatsBase } from './utils/baseStatsHook';
import { computeEventStats } from '../utils/eventStatsUtils';

export function useEventStatsFromRaw() {
  return useGameStatsBase(computeEventStats);
}

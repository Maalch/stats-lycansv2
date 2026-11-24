import { describe, expect, it } from 'vitest';
import { getMinimumGamesThreshold } from './ranking-thresholds.js';

describe('getMinimumGamesThreshold', () => {
  it.each([
    [5, 1000, 10],
    [10, 1000, 20],
    [15, 1000, 20],
    [20, 1000, 50],
    [25, 1000, 50],
    [30, 1000, 50],
    [50, 1000, 100]
  ])('scales a base minimum of %i games for a dataset of %i games', (baseMinimum, totalGames, expected) => {
    expect(getMinimumGamesThreshold(baseMinimum, totalGames)).toBe(expected);
  });

  it.each([
    [5, 300, 5],
    [50, 400, 50]
  ])('keeps the base minimum of %i games when the dataset is small', (baseMinimum, totalGames, expected) => {
    expect(getMinimumGamesThreshold(baseMinimum, totalGames)).toBe(expected);
  });

  it('rounds a fractional percentage threshold up to a whole game', () => {
    expect(getMinimumGamesThreshold(5, 550)).toBe(6);
  });

  it('leaves unmapped minimums unchanged', () => {
    expect(getMinimumGamesThreshold(1, 1000)).toBe(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { generateUrlWithSettings } from '../utils/urlGenerators';

// Represents the pattern used by the many *FromRaw hooks in src/hooks that
// consume SettingsContext: wrap renderHook with the provider.
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
});

describe('useSettings (via SettingsProvider)', () => {
  it('exposes default settings when there is no URL/localStorage state', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    expect(result.current.settings.dataSource).toBe('main');
    expect(result.current.settings.independentFilters.gameTypeEnabled).toBe(false);
    expect(result.current.settings.highlightedPlayer).toBeNull();
  });

  it('updateSettings merges partial changes into state and persists them to localStorage', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    act(() => {
      result.current.updateSettings({ tab: 'general', subtab: 'evolution' });
    });

    expect(result.current.settings.tab).toBe('general');
    expect(result.current.settings.subtab).toBe('evolution');
    expect(JSON.parse(localStorage.getItem('lycans-settings')!).tab).toBe('general');
  });

  it('resetSettings restores default state', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    act(() => {
      result.current.updateSettings({ tab: 'general' });
    });
    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.tab).toBeNull();
  });

  it('persists and restores the current session option in shareable URLs', () => {
    const { result, unmount } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    act(() => {
      result.current.updateSettings({
        independentFilters: {
          ...result.current.settings.independentFilters,
          dateRangeEnabled: true,
          dateRange: { start: '2025-01-01', end: null, currentSession: true },
        },
      });
    });

    expect(new URLSearchParams(window.location.search).get('currentSession')).toBe('true');
    const shareUrl = result.current.generateUrlWithSettings();
    expect(new URL(shareUrl).searchParams.get('currentSession')).toBe('true');
    expect(new URL(generateUrlWithSettings('https://example.com', result.current.settings)).searchParams.get('currentSession')).toBe('true');
    unmount();
    window.history.replaceState({}, '', new URL(shareUrl).pathname + new URL(shareUrl).search);
    const restored = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(restored.result.current.settings.independentFilters.dateRange).toEqual({
      start: '2025-01-01', end: null, currentSession: true,
    });
  });
});

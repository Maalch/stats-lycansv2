import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

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
});

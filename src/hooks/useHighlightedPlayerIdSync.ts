import { useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useJoueursData } from './useJoueursData';
import { getPlayerIdByCanonicalName } from '../utils/playerIdentification';

/**
 * Keeps `highlightedPlayerId` (persisted in the URL as `highlightedID`) in sync with
 * `highlightedPlayer` (the canonical name every chart still reads/compares against).
 * The name stays the interactive source of truth; the id is derived from it, except for
 * the one-time bootstrap when a shared URL only provides an id and the name hasn't been
 * resolved yet this session. An id that doesn't match any known player is silently cleared.
 */
export function useHighlightedPlayerIdSync() {
  const { settings, updateSettings } = useSettings();
  const { joueursData } = useJoueursData();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!joueursData) return;

    if (!bootstrappedRef.current && !settings.highlightedPlayer && settings.highlightedPlayerId) {
      bootstrappedRef.current = true;
      const resolvedName = joueursData.Players.find(p => p.SteamID === settings.highlightedPlayerId)?.Joueur ?? null;
      if (resolvedName) {
        updateSettings({ highlightedPlayer: resolvedName });
      } else {
        updateSettings({ highlightedPlayerId: null });
      }
      return;
    }
    bootstrappedRef.current = true;

    if (settings.highlightedPlayer) {
      const expectedId = getPlayerIdByCanonicalName(settings.highlightedPlayer, joueursData);
      if (expectedId !== settings.highlightedPlayerId) {
        updateSettings({ highlightedPlayerId: expectedId });
      }
    } else if (settings.highlightedPlayerId) {
      updateSettings({ highlightedPlayerId: null });
    }
  }, [joueursData, settings.highlightedPlayer, settings.highlightedPlayerId, updateSettings]);
}

/** Renderless component wrapper so the sync hook can be mounted once from JSX. */
export function HighlightedPlayerIdSync() {
  useHighlightedPlayerIdSync();
  return null;
}

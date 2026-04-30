import { useState, useEffect } from 'react';

// ============================================
// Type definitions for gameReference.json
// ============================================

export interface GameReferenceMeta {
  description: string;
  version: string;
  lastUpdated: string;
  sourceTranslationsFile: string;
  notes: string;
}

export interface RelatedItem {
  type: string;
  id: string;
  label: string;
}

export interface CampEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  winCondition: string;
  roles: string[];
  relatedItems?: RelatedItem[];
}

export interface MainRoleEntry {
  id: string;
  name: string;
  camp: string;
  emoji: string;
  type: string;
  description: string;
  descriptionShort?: string;
  translationKey?: string;
  subRoles?: { id: string; name: string; translationKey?: string }[];
  relatedItems?: RelatedItem[];
}

export interface PowerEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  descriptionShort?: string;
  translationKey?: string;
  relatedItems?: RelatedItem[];
}

export interface SecondaryRoleEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  descriptionShort?: string;
  descriptionVillager?: string;
  descriptionWolf?: string;
  translationKey?: string;
  relatedItems?: RelatedItem[];
}

export interface DeadRoleEntry {
  id: string;
  name: string;
  emoji: string;
  camp: string;
  description: string;
  translationKey?: string;
}

export interface AccessoryEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tinkererEffect: string;
  translationKey?: string;
}

export interface GadgetEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  translationKey?: string;
  gasTypes?: { id: string; name: string; translationKey?: string }[];
}

export interface PotionEffectEntry {
  id: string;
  name: string;
  type: string;
  translationKey?: string;
  tutorial?: string;
  source?: string;
  randomEffects?: string[];
}

export interface StatusEffectEntry {
  id: string;
  name: string;
  translationKey?: string;
  tutorial?: string;
}

export interface EventEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  translationKey?: string;
}

export interface GameReferenceData {
  _meta: GameReferenceMeta;
  camps: CampEntry[];
  mainRoles: MainRoleEntry[];
  wolfPowers: PowerEntry[];
  villagerPowers: PowerEntry[];
  elitePowers: PowerEntry[];
  secondaryRoles: SecondaryRoleEntry[];
  deadRoles: DeadRoleEntry[];
  accessories: AccessoryEntry[];
  gadgets: GadgetEntry[];
  potionEffects: PotionEffectEntry[];
  statusEffects: StatusEffectEntry[];
  events: EventEntry[];
}

/**
 * Hook to load game reference data from gameReference.json
 * This is static reference data shared across all data sources (main/discord).
 */
export function useGameReference() {
  const [data, setData] = useState<GameReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReference = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `${import.meta.env.BASE_URL}data/gameReference.json`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            setError('Les données de référence du jeu ne sont pas encore disponibles.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return;
        }

        const referenceData: GameReferenceData = await response.json();
        setData(referenceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données de référence');
      } finally {
        setIsLoading(false);
      }
    };

    loadReference();
  }, []);

  return { data, isLoading, error };
}

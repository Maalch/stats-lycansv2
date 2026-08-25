import type { GameReferenceData, RelatedItem } from '../../hooks/useGameReference';
import type { ItemCategoryKey } from './GameReferencePage';

export type RelatedItemTarget =
  | { kind: 'camp'; campId: string }
  | { kind: 'itemCategory'; key: ItemCategoryKey }
  | { kind: 'overview' }
  | null;

export interface ResolvedRelatedItem {
  name: string;
  target: RelatedItemTarget;
}

/** Resolves a RelatedItem chip to its canonical name and where clicking it should navigate. */
export function resolveRelatedItem(data: GameReferenceData, item: RelatedItem): ResolvedRelatedItem | null {
  switch (item.type) {
    case 'camp': {
      const entry = data.camps.find(c => c.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: entry.id } } : null;
    }
    case 'mainRole': {
      const entry = data.mainRoles.find(r => r.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: entry.camp } } : null;
    }
    case 'wolfPower': {
      const entry = data.wolfPowers.find(p => p.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: 'loup' } } : null;
    }
    case 'villagerPower': {
      const entry = data.villagerPowers.find(p => p.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: 'villageois' } } : null;
    }
    case 'elitePower': {
      const entry = data.elitePowers.find(p => p.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: 'villageois' } } : null;
    }
    case 'secondaryRole': {
      const entry = data.secondaryRoles.find(r => r.id === item.id);
      // Secondary roles are shown under every camp — no camp switch needed, just filter in place.
      return entry ? { name: entry.name, target: null } : null;
    }
    case 'deadRole': {
      const entry = data.deadRoles.find(r => r.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'camp', campId: entry.camp } } : null;
    }
    case 'accessory': {
      const entry = data.accessories.find(a => a.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'itemCategory', key: 'accessories' } } : null;
    }
    case 'gadget': {
      const entry = data.gadgets.find(g => g.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'itemCategory', key: 'gadgets' } } : null;
    }
    case 'event': {
      const entry = data.events.find(e => e.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'itemCategory', key: 'events' } } : null;
    }
    case 'effect': {
      const entry = data.potionEffects.find(e => e.id === item.id) ?? data.statusEffects.find(e => e.id === item.id);
      return entry ? { name: entry.name, target: { kind: 'itemCategory', key: 'effects' } } : null;
    }
    case 'gameRule':
    case 'sabotage': {
      const entry = data.gameRules.find(r => r.id === item.id);
      if (!entry) return null;
      return {
        name: entry.name,
        target: entry.campSpecific ? { kind: 'camp', campId: entry.campSpecific } : { kind: 'overview' },
      };
    }
    default:
      return null;
  }
}

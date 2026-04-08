import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { SimulatorSlot, CampType } from '../../../types/whatIfSimulator';
import { VILLAGEOIS_ROLES, LOUP_ROLES, SOLO_ROLES } from '../../../types/whatIfSimulator';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../../utils/playerIdentification';

interface TeamBuilderProps {
  playerCount: number;
  slots: SimulatorSlot[];
  onSlotsChange: (slots: SimulatorSlot[]) => void;
}

const CAMP_CONFIG: { camp: CampType; label: string; dotClass: string; roles: readonly string[] }[] = [
  { camp: 'Villageois', label: 'Villageois', dotClass: 'villageois', roles: VILLAGEOIS_ROLES },
  { camp: 'Loup', label: 'Loups', dotClass: 'loup', roles: LOUP_ROLES },
  { camp: 'Solo', label: 'Solo', dotClass: 'solo', roles: SOLO_ROLES },
];

function getRoleAbbrev(role?: string): string {
  if (!role) return '?';
  const abbrevMap: Record<string, string> = {
    'Villageois': 'V',
    'Chasseur': 'Ch',
    'Alchimiste': 'Al',
    'Protecteur': 'Pr',
    'Disciple': 'Di',
    'Guetteur': 'Gu',
    'Purificateur': 'Pu',
    'Loup': 'L',
    'Traître': 'Tr',
    'Louveteau': 'Lv',
    'Amoureux': 'Am',
    'Idiot du Village': 'Id',
    'Agent': 'Ag',
    'Espion': 'Es',
    'Contrebandier': 'Cb',
    'Kidnappeur': 'Ki',
    'Scientifique': 'Sc',
    'La Bête': 'Bê',
    'Chasseur de primes': 'Cp',
    'Vaudou': 'Va',
  };
  return abbrevMap[role] || role.substring(0, 2);
}

const ANY_ROLE_LABEL: Record<CampType, string> = {
  Villageois: 'Tous les rôles Villageois',
  Loup: 'Tous les rôles Loups',
  Solo: 'Tous les rôles Solo',
};

function SlotPopover({
  slot,
  slotIndex,
  camp,
  roles,
  players,
  onUpdate,
  onClose,
}: {
  slot: SimulatorSlot;
  slotIndex: number;
  camp: CampType;
  roles: readonly string[];
  players: { id: string; name: string }[];
  onUpdate: (index: number, update: Partial<SimulatorSlot>) => void;
  onClose: () => void;
}) {
  const [playerSearch, setPlayerSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredPlayers = useMemo(() => {
    if (!playerSearch.trim()) return players.slice(0, 8);
    const query = playerSearch.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(query)).slice(0, 8);
  }, [playerSearch, players]);

  return (
    <div className="whatif-slot-popover" ref={popoverRef}>
      <select
        value={slot.role || ''}
        onChange={(e) => onUpdate(slotIndex, { role: e.target.value || undefined })}
      >
        <option value="">{ANY_ROLE_LABEL[camp]}</option>
        {roles.map(role => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>

      <input
        type="text"
        className="whatif-player-search"
        placeholder="Assigner un joueur..."
        value={playerSearch}
        onChange={(e) => setPlayerSearch(e.target.value)}
        autoFocus
      />

      <div className="whatif-player-suggestions">
        {filteredPlayers.map(p => (
          <div
            key={p.id}
            className="whatif-player-suggestion"
            onClick={() => {
              onUpdate(slotIndex, { player: { id: p.id, name: p.name } });
              onClose();
            }}
          >
            {p.name}
          </div>
        ))}
      </div>

      {(slot.player || slot.role) && (
        <button
          type="button"
          className="whatif-clear-btn"
          onClick={() => {
            onUpdate(slotIndex, { role: undefined, player: undefined });
            onClose();
          }}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

export function TeamBuilder({ playerCount, slots, onSlotsChange }: TeamBuilderProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const { gameData } = useCombinedFilteredRawData();

  // Build unique player list from game data
  const allPlayers = useMemo(() => {
    if (!gameData) return [];
    const playerMap = new Map<string, string>();
    for (const game of gameData) {
      for (const p of game.PlayerStats) {
        const id = getPlayerId(p);
        if (!playerMap.has(id)) {
          playerMap.set(id, getCanonicalPlayerName(p));
        }
      }
    }
    return Array.from(playerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [gameData]);

  const campCounts = useMemo(() => {
    const counts: Record<CampType, number> = { Villageois: 0, Loup: 0, Solo: 0 };
    for (const s of slots) counts[s.camp]++;
    return counts;
  }, [slots]);

  const handleCampCountChange = useCallback((camp: CampType, delta: number) => {
    const newSlots = [...slots];
    if (delta > 0) {
      // Add a slot for this camp, remove from the camp with most unassigned slots
      const otherCamps = CAMP_CONFIG.map(c => c.camp).filter(c => c !== camp);
      // Find which camp to take from (prefer the one with most generic slots)
      let takeCamp: CampType | null = null;
      let maxGeneric = 0;
      for (const oc of otherCamps) {
        const genericCount = newSlots.filter(s => s.camp === oc && !s.role && !s.player).length;
        if (genericCount > maxGeneric) {
          maxGeneric = genericCount;
          takeCamp = oc;
        }
      }
      if (!takeCamp) {
        // No generic slot to take from, take from the one with most slots overall
        for (const oc of otherCamps) {
          const count = newSlots.filter(s => s.camp === oc).length;
          if (count > maxGeneric) {
            maxGeneric = count;
            takeCamp = oc;
          }
        }
      }
      if (takeCamp && campCounts[takeCamp] > 0) {
        // Remove last unassigned slot from that camp
        const idx = newSlots.findLastIndex(s => s.camp === takeCamp && !s.role && !s.player);
        if (idx >= 0) {
          newSlots.splice(idx, 1);
        } else {
          // Remove last slot from that camp
          const lastIdx = newSlots.findLastIndex(s => s.camp === takeCamp);
          if (lastIdx >= 0) newSlots.splice(lastIdx, 1);
        }
        newSlots.push({ camp });
      }
    } else {
      // Remove one slot from this camp (prefer unassigned)
      if (campCounts[camp] <= 0) return;
      const idx = newSlots.findLastIndex(s => s.camp === camp && !s.role && !s.player);
      if (idx >= 0) {
        newSlots.splice(idx, 1);
      } else {
        const lastIdx = newSlots.findLastIndex(s => s.camp === camp);
        if (lastIdx >= 0) newSlots.splice(lastIdx, 1);
      }
      // Add to villageois by default (if removing from non-villageois)
      const addToCamp: CampType = camp === 'Villageois' ? 'Loup' : 'Villageois';
      newSlots.push({ camp: addToCamp });
    }
    onSlotsChange(newSlots);
    setActiveSlot(null);
  }, [slots, campCounts, onSlotsChange]);

  const handleSlotUpdate = useCallback((index: number, update: Partial<SimulatorSlot>) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], ...update };
    onSlotsChange(newSlots);
  }, [slots, onSlotsChange]);

  // Track absolute slot index across camp sections
  let globalIndex = 0;

  return (
    <div className="whatif-team-builder">
      {CAMP_CONFIG.map(({ camp, label, dotClass, roles }) => {
        const campSlots = slots
          .map((s, i) => ({ slot: s, index: i }))
          .filter(({ slot }) => slot.camp === camp);
        const count = campSlots.length;

        // Min slots per camp
        const minCount = camp === 'Villageois' ? 1 : 0;
        // Max is playerCount minus the minimum required by each other camp (Villageois needs 1, others need 0)
        const maxCount = playerCount - CAMP_CONFIG
          .filter(c => c.camp !== camp)
          .reduce((sum, c) => sum + (c.camp === 'Villageois' ? 1 : 0), 0);
        // "+" is only actionable when another camp can donate a slot (above its own minimum)
        const canIncrement = CAMP_CONFIG
          .filter(c => c.camp !== camp)
          .some(c => campCounts[c.camp] > (c.camp === 'Villageois' ? 1 : 0));

        return (
          <div key={camp} className="whatif-camp-section">
            <div className="whatif-camp-header">
              <span className="whatif-camp-title">
                <span className={`camp-dot ${dotClass}`} />
                {label}
              </span>
              <div className="whatif-camp-count">
                <button
                  type="button"
                  className="whatif-camp-count-btn"
                  disabled={count <= minCount}
                  onClick={() => handleCampCountChange(camp, -1)}
                >
                  −
                </button>
                <span className="whatif-camp-count-value">{count}</span>
                <button
                  type="button"
                  className="whatif-camp-count-btn"
                  disabled={count >= maxCount || !canIncrement}
                  onClick={() => handleCampCountChange(camp, 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="whatif-slots">
              {campSlots.map(({ slot, index }) => {
                const slotGlobal = globalIndex++;
                const isActive = activeSlot === index;
                const hasRole = !!slot.role;
                const hasPlayer = !!slot.player;

                return (
                  <div key={`${camp}-${slotGlobal}`} className="whatif-slot">
                    <div
                      className={`whatif-slot-circle ${dotClass} ${hasRole || hasPlayer ? 'filled' : ''} ${hasPlayer ? 'has-player' : ''}`}
                      onClick={() => setActiveSlot(isActive ? null : index)}
                      title={slot.role || label}
                    >
                      {hasPlayer
                        ? slot.player!.name.charAt(0).toUpperCase()
                        : hasRole
                          ? getRoleAbbrev(slot.role)
                          : getRoleAbbrev(camp === 'Loup' ? 'Loup' : camp === 'Solo' ? undefined : 'Villageois')
                      }
                    </div>
                    <span className="whatif-slot-label">
                      {slot.role || (camp === 'Loup' ? 'Loup' : camp === 'Villageois' ? 'Villageois' : 'Solo')}
                    </span>
                    {hasPlayer && (
                      <span className="whatif-slot-player">{slot.player!.name}</span>
                    )}

                    {isActive && (
                      <SlotPopover
                        slot={slot}
                        slotIndex={index}
                        camp={camp}
                        roles={roles}
                        players={allPlayers}
                        onUpdate={handleSlotUpdate}
                        onClose={() => setActiveSlot(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Reset globalIndex for re-renders */}
      {void (globalIndex = 0)}
    </div>
  );
}

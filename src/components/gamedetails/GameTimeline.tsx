import { useMemo, useState } from 'react';
import type { GameEvent, PlayerStat } from '../../hooks/useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { useThemeAdjustedLycansColorScheme, translateDailyEventName } from '../../types/api';
import { getDeathTypeLabel } from '../../types/deathTypes';

// --- Types ---

interface TimelineEvent {
  date: string;           // ISO date for sorting
  timing: string;         // Game timing (J1, N1, M1, etc.)
  category: 'phase' | 'mayor' | 'dailyEvent' | 'sabotage' | 'action' | 'death' | 'vote';
  emoji: string;
  playerName?: string;
  playerCamp?: string;
  description: string;
}

interface PhaseGroup {
  phaseName: string;
  phaseType: 'day' | 'night' | 'meeting' | 'other';
  events: TimelineEvent[];
}

interface JourneeGroup {
  number: number | null;  // null for 'Pré-partie'
  label: string;
  phases: PhaseGroup[];
}

// --- Helpers ---

function getActionEmoji(actionType: string): string {
  switch (actionType) {
    case 'Transform': return '🐺';
    case 'Untransform': return '🐺';
    case 'UseGadget': return '🎒';
    case 'DrinkPotion': return '🧪';
    case 'HunterShoot': return '🎯';
    case 'TakeAccessory': return '📦';
    case 'Sabotage': return '🔧';
    default: return '⚙️';
  }
}

function getActionLabel(actionType: string, actionName: string | null, actionTarget: string | null): string {
  let label = '';
  switch (actionType) {
    case 'Transform':
      label = 'Se transforme';
      break;
    case 'Untransform':
      label = 'Se détransforme';
      break;
    case 'UseGadget':
      label = actionName ? `Utilise ${actionName}` : 'Utilise un gadget';
      if (actionTarget) label += ` sur ${actionTarget}`;
      break;
    case 'DrinkPotion':
      label = actionName ? `Boit ${actionName}` : 'Boit une potion';
      if (actionTarget) label += ` sur ${actionTarget}`;
      break;
    case 'HunterShoot':
      label = actionTarget ? `Tire sur ${actionTarget}` : 'Tire (Chasseur)';
      break;
    case 'TakeAccessory':
      label = actionName ? `Prend ${actionName}` : 'Prend un accessoire';
      break;
    case 'Sabotage':
      label = actionName ? `Sabotage: ${actionName}` : 'Sabotage';
      if (actionTarget) label += ` sur ${actionTarget}`;
      break;
    default:
      label = actionName || actionType;
      if (actionTarget) label += ` → ${actionTarget}`;
  }
  return label;
}

function getPhaseType(phaseName: string): 'day' | 'night' | 'meeting' | 'other' {
  if (phaseName.startsWith('J')) return 'day';
  if (phaseName.startsWith('N')) return 'night';
  if (phaseName.startsWith('M')) return 'meeting';
  return 'other';
}

function getPhaseDisplayName(phaseName: string): string {
  const type = getPhaseType(phaseName);
  const number = phaseName.slice(1);
  switch (type) {
    case 'day': return `☀️ Jour ${number}`;
    case 'night': return `🌙 Nuit ${number}`;
    case 'meeting': return `🗣️ Réunion ${number}`;
    default: return phaseName;
  }
}

function formatElapsedTime(isoDate: string, startIso: string): string {
  try {
    const elapsed = Math.max(0, new Date(isoDate).getTime() - new Date(startIso).getTime());
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

// --- Group phases into Journées ---

function groupByJournee(groups: PhaseGroup[]): JourneeGroup[] {
  const journeeMap = new Map<number | null, PhaseGroup[]>();

  for (const group of groups) {
    if (group.phaseName === 'Pré-partie') {
      const list = journeeMap.get(null) ?? [];
      list.push(group);
      journeeMap.set(null, list);
    } else {
      const num = parseInt(group.phaseName.slice(1), 10);
      const list = journeeMap.get(num) ?? [];
      list.push(group);
      journeeMap.set(num, list);
    }
  }

  const result: JourneeGroup[] = [];

  if (journeeMap.has(null)) {
    result.push({ number: null, label: 'Pré-partie', phases: journeeMap.get(null)! });
  }

  const nums = [...journeeMap.keys()]
    .filter((k): k is number => k !== null)
    .sort((a, b) => a - b);

  for (const num of nums) {
    result.push({ number: num, label: `Journée ${num}`, phases: journeeMap.get(num)! });
  }

  return result;
}

// --- Build Timeline ---

function buildTimeline(gameEvents: GameEvent[], playerData: PlayerStat[]): PhaseGroup[] {
  const allEvents: TimelineEvent[] = [];

  // 1. Collect GameEvents (non-phase ones as timeline events)
  for (const event of gameEvents) {
    if (event.Type === 'NewPhase') continue; // phases are used as group separators
    
    let category: TimelineEvent['category'];
    let emoji: string;
    let description: string;

    switch (event.Type) {
      case 'NewMayor':
        category = 'mayor';
        emoji = '👑';
        description = `${event.Name} devient Maire`;
        break;
      case 'DailyEventStart':
        category = 'dailyEvent';
        emoji = '⚡';
        description = `Événement: ${translateDailyEventName(event.Name)}`;
        break;
      case 'SabotageActive':
        category = 'sabotage';
        emoji = '🔧';
        description = `Sabotage activé: ${event.Name}`;
        break;
      default:
        category = 'dailyEvent';
        emoji = '📌';
        description = `${event.Type}: ${event.Name}`;
    }

    allEvents.push({
      date: event.Date,
      timing: event.Timing,
      category,
      emoji,
      description,
    });
  }

  // 2. Collect Player Actions
  for (const player of playerData) {
    if (player.Actions && player.Actions.length > 0) {
      for (const action of player.Actions) {
        allEvents.push({
          date: action.Date,
          timing: action.Timing,
          category: 'action',
          emoji: getActionEmoji(action.ActionType),
          playerName: player.Username,
          playerCamp: getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])),
          description: getActionLabel(action.ActionType, action.ActionName, action.ActionTarget),
        });
      }
    }
  }

  // 3. Collect Player Deaths
  for (const player of playerData) {
    if (player.DeathDateIrl && player.DeathTiming) {
      const killerInfo = player.KillerName ? ` par ${player.KillerName}` : '';
      const deathTypeInfo = player.DeathType ? ` (${getDeathTypeLabel(player.DeathType)})` : '';
      allEvents.push({
        date: player.DeathDateIrl,
        timing: player.DeathTiming,
        category: 'death',
        emoji: '💀',
        playerName: player.Username,
        playerCamp: getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])),
        description: `Meurt${deathTypeInfo}${killerInfo}`,
      });
    }
  }

  // 4. Collect Player Votes
  for (const player of playerData) {
    if (player.Votes && player.Votes.length > 0) {
      for (const vote of player.Votes) {
        if (!vote.Date) continue; // Skip votes without a date
        const target = vote.Target === 'Passé' ? 'Passe son vote' : `Vote contre ${vote.Target}`;
        allEvents.push({
          date: vote.Date,
          timing: `M${vote.Day}`,
          category: 'vote',
          emoji: '🗳️',
          playerName: player.Username,
          playerCamp: getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])),
          description: target,
        });
      }
    }
  }

  // 5. Sort all events by date
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  // 6. Get phase boundaries from GameEvents
  const phases = gameEvents
    .filter(e => e.Type === 'NewPhase')
    .sort((a, b) => a.Date.localeCompare(b.Date));

  // 7. Group events into phases
  const groups: PhaseGroup[] = [];

  for (let i = 0; i < phases.length; i++) {
    const currentPhase = phases[i];
    const nextPhase = phases[i + 1];

    const phaseEvents = allEvents.filter(event => {
      if (nextPhase) {
        return event.date >= currentPhase.Date && event.date < nextPhase.Date;
      }
      return event.date >= currentPhase.Date;
    });

    if (phaseEvents.length > 0) {
      groups.push({
        phaseName: currentPhase.Name,
        phaseType: getPhaseType(currentPhase.Name),
        events: phaseEvents,
      });
    }
  }

  // Events before first phase (rare edge case)
  if (phases.length > 0) {
    const prePhaseEvents = allEvents.filter(event => event.date < phases[0].Date);
    if (prePhaseEvents.length > 0) {
      groups.unshift({
        phaseName: 'Pré-partie',
        phaseType: 'other',
        events: prePhaseEvents,
      });
    }
  }

  return groups;
}

// --- Component ---

interface GameTimelineProps {
  game: {
    gameEvents: GameEvent[];
    playerData: PlayerStat[];
    startDate: string;
  };
}

export function GameTimeline({ game }: GameTimelineProps) {
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const [showTimeline, setShowTimeline] = useState(false);
  const [expandedJournees, setExpandedJournees] = useState<Set<number | null>>(new Set());
  const startDate = game.startDate;

  // Only render if we have phase events
  const hasPhaseEvents = game.gameEvents?.some(e => e.Type === 'NewPhase');
  
  const timeline = useMemo(() => {
    if (!hasPhaseEvents) return [];
    return buildTimeline(game.gameEvents, game.playerData);
  }, [game.gameEvents, game.playerData, hasPhaseEvents]);

  const journeeGroups = useMemo(() => groupByJournee(timeline), [timeline]);

  if (!hasPhaseEvents || timeline.length === 0) {
    return null;
  }

  const toggleJournee = (num: number | null) => {
    setExpandedJournees(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  return (
    <div className="lycans-game-detail-section full-width">
      <h4
        className="lycans-timeline-toggle"
        onClick={() => setShowTimeline(v => !v)}
        role="button"
        aria-expanded={showTimeline}
      >
        📜 Chronologie de la Partie
        <span className="lycans-timeline-toggle-arrow">{showTimeline ? '▲' : '▼'}</span>
      </h4>
      {showTimeline && (
        <div className="lycans-timeline">
          {journeeGroups.map((journee, journeeIdx) => {
            const isExpanded = expandedJournees.has(journee.number);
            return (
              <div key={journeeIdx} className="lycans-timeline-journee">
                <button
                  className={`lycans-timeline-journee-header${isExpanded ? ' expanded' : ''}`}
                  onClick={() => toggleJournee(journee.number)}
                  type="button"
                >
                  <span>{journee.label}</span>
                  <span className="lycans-timeline-journee-arrow">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="lycans-timeline-journee-content">
                    {journee.phases.map((group, groupIdx) => (
                      <div key={groupIdx} className={`lycans-timeline-phase lycans-timeline-phase--${group.phaseType}`}>
                        <div className={`lycans-timeline-phase-header lycans-timeline-phase-header--${group.phaseType}`}>
                          {getPhaseDisplayName(group.phaseName)}
                        </div>
                        <div className="lycans-timeline-events">
                          {group.events.map((event, eventIdx) => {
                            const playerColor = event.playerCamp
                              ? lycansColorScheme[event.playerCamp as keyof typeof lycansColorScheme] || 'var(--text-primary)'
                              : undefined;

                            return (
                              <div key={eventIdx} className={`lycans-timeline-event lycans-timeline-event--${event.category}`}>
                                <span className="lycans-timeline-event-time">{formatElapsedTime(event.date, startDate)}</span>
                                <span className="lycans-timeline-event-emoji">{event.emoji}</span>
                                <span className="lycans-timeline-event-content">
                                  {event.playerName && (
                                    <span className="lycans-timeline-event-player" style={{ color: playerColor }}>
                                      {event.playerName}
                                    </span>
                                  )}
                                  <span className="lycans-timeline-event-desc">{event.description}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

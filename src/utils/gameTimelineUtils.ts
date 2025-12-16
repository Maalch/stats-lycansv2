import type { GameLogEntry } from '../hooks/useCombinedRawData';

export type TimelineEventType = 'action' | 'vote' | 'death' | 'roleChange' | 'gameEnd';

export interface TimelineEvent {
  type: TimelineEventType;
  playerName: string;
  playerColor?: string;
  timestamp: string; // ISO date string
  timing: string; // "N1", "J2", "M3", etc.
  
  // Event-specific data
  actionType?: string; // "UseGadget", "DrinkPotion", "Sabotage"
  actionName?: string; // "Diamant", "Invisible", etc.
  actionTarget?: string;
  voteTarget?: string;
  voteDay?: number;
  deathType?: string | null;
  killerName?: string | null;
  newRole?: string;
  position?: { x: number; y: number; z: number };
}

export interface PhaseEvents {
  phase: string; // "N1", "J2", "M3"
  phaseType: 'night' | 'day' | 'meeting'; // N, J, M
  phaseNumber: number;
  events: TimelineEvent[];
  startTime?: string; // First event timestamp in phase
  endTime?: string; // Last event timestamp in phase
}

export interface GameTimeline {
  phases: PhaseEvents[];
  allPlayers: string[]; // All player names in game
  startDate: string;
  endDate: string;
  totalEvents: number;
}

/**
 * Extract phase type and number from timing string
 * Examples: "N1" -> { type: 'night', number: 1 }, "J3" -> { type: 'day', number: 3 }
 */
function parsePhase(timing: string): { type: 'night' | 'day' | 'meeting'; number: number } | null {
  if (!timing) return null;
  
  const match = timing.match(/^([NJM])(\d+)$/);
  if (!match) return null;
  
  const [, phaseChar, numStr] = match;
  const number = parseInt(numStr, 10);
  
  let type: 'night' | 'day' | 'meeting';
  if (phaseChar === 'N') type = 'night';
  else if (phaseChar === 'J') type = 'day';
  else type = 'meeting';
  
  return { type, number };
}

/**
 * Get sort order for phase types (Night < Day < Meeting)
 */
function getPhaseOrder(phaseType: 'night' | 'day' | 'meeting'): number {
  switch (phaseType) {
    case 'night': return 0;
    case 'day': return 1;
    case 'meeting': return 2;
    default: return 0;
  }
}

/**
 * Compare two phase strings for sorting
 */
function comparePhases(a: string, b: string): number {
  const phaseA = parsePhase(a);
  const phaseB = parsePhase(b);
  
  if (!phaseA || !phaseB) return 0;
  
  // First compare by number
  if (phaseA.number !== phaseB.number) {
    return phaseA.number - phaseB.number;
  }
  
  // Then by phase type (Night < Day < Meeting)
  return getPhaseOrder(phaseA.type) - getPhaseOrder(phaseB.type);
}

/**
 * Build comprehensive timeline from game data
 */
export function buildGameTimeline(game: GameLogEntry): GameTimeline {
  const allEvents: TimelineEvent[] = [];
  const allPlayers = game.PlayerStats.map(p => p.Username);
  
  // Process each player's data
  game.PlayerStats.forEach(player => {
    const playerColor = player.Color;
    
    // Add actions
    if (player.Actions && Array.isArray(player.Actions)) {
      player.Actions.forEach(action => {
        allEvents.push({
          type: 'action',
          playerName: player.Username,
          playerColor,
          timestamp: action.Date,
          timing: action.Timing,
          actionType: action.ActionType,
          actionName: action.ActionName || undefined,
          actionTarget: action.ActionTarget || undefined,
          position: action.Position
        });
      });
    }
    
    // Add votes
    if (player.Votes && Array.isArray(player.Votes)) {
      player.Votes.forEach(vote => {
        if (vote.Date) { // Only add votes with timestamps
          allEvents.push({
            type: 'vote',
            playerName: player.Username,
            playerColor,
            timestamp: vote.Date,
            timing: `M${vote.Day}`, // Votes happen during meetings
            voteTarget: vote.Target,
            voteDay: vote.Day
          });
        }
      });
    }
    
    // Add death event
    if (player.DeathDateIrl && player.DeathTiming) {
      allEvents.push({
        type: 'death',
        playerName: player.Username,
        playerColor,
        timestamp: player.DeathDateIrl,
        timing: player.DeathTiming,
        deathType: player.DeathType,
        killerName: player.KillerName || undefined
      });
    }
    
    // Add role changes
    if (player.MainRoleChanges && Array.isArray(player.MainRoleChanges)) {
      player.MainRoleChanges.forEach(roleChange => {
        // Try to determine timing from timestamp (rough estimate)
        const changeDate = new Date(roleChange.RoleChangeDateIrl);
        const gameStart = new Date(game.StartDate);
        const minutesSinceStart = (changeDate.getTime() - gameStart.getTime()) / 1000 / 60;
        const estimatedPhase = Math.floor(minutesSinceStart / 5); // Rough estimate: 5 min per phase
        
        allEvents.push({
          type: 'roleChange',
          playerName: player.Username,
          playerColor,
          timestamp: roleChange.RoleChangeDateIrl,
          timing: `N${estimatedPhase || 1}`, // Default to N1 if can't determine
          newRole: roleChange.NewMainRole
        });
      });
    }
  });
  
  // Add game end event
  if (game.EndTiming) {
    allEvents.push({
      type: 'gameEnd',
      playerName: '', // No specific player
      timestamp: game.EndDate,
      timing: game.EndTiming
    });
  }
  
  // Sort events by timestamp
  allEvents.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });
  
  // Group events by phase
  const phaseMap = new Map<string, TimelineEvent[]>();
  
  allEvents.forEach(event => {
    const phase = event.timing;
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, []);
    }
    phaseMap.get(phase)!.push(event);
  });
  
  // Convert map to sorted array of PhaseEvents
  const phases: PhaseEvents[] = Array.from(phaseMap.entries())
    .map(([phase, events]) => {
      const parsed = parsePhase(phase);
      const timestamps = events.map(e => e.timestamp).sort();
      
      return {
        phase,
        phaseType: parsed?.type || 'night',
        phaseNumber: parsed?.number || 0,
        events,
        startTime: timestamps[0],
        endTime: timestamps[timestamps.length - 1]
      };
    })
    .sort((a, b) => comparePhases(a.phase, b.phase));
  
  return {
    phases,
    allPlayers,
    startDate: game.StartDate,
    endDate: game.EndDate,
    totalEvents: allEvents.length
  };
}

/**
 * Get icon for event type
 */
export function getEventIcon(event: TimelineEvent): string {
  switch (event.type) {
    case 'action':
      if (event.actionType === 'Sabotage') return '⚙️';
      if (event.actionType === 'DrinkPotion') return '🧪';
      if (event.actionType === 'UseGadget') return '🔧';
      return '⚡';
    case 'vote':
      if (event.voteTarget === 'Passé') return '🙅';
      return '🗳️';
    case 'death':
      return '💀';
    case 'roleChange':
      return '🔄';
    case 'gameEnd':
      return '🏁';
    default:
      return '•';
  }
}

/**
 * Get display label for event
 */
export function getEventLabel(event: TimelineEvent): string {
  switch (event.type) {
    case 'action':
      if (event.actionType === 'Sabotage') return 'Sabotage';
      if (event.actionName) return event.actionName;
      return event.actionType || 'Action';
    case 'vote':
      return event.voteTarget === 'Passé' ? 'Abstention' : `Vote → ${event.voteTarget}`;
    case 'death':
      return event.deathType === 'VOTED' ? 'Mort aux votes' : 'Mort';
    case 'roleChange':
      return `→ ${event.newRole}`;
    case 'gameEnd':
      return 'Fin de partie';
    default:
      return '';
  }
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase: string): string {
  const parsed = parsePhase(phase);
  if (!parsed) return phase;
  
  const { type, number } = parsed;
  
  switch (type) {
    case 'night':
      return `Nuit ${number}`;
    case 'day':
      return `Jour ${number}`;
    case 'meeting':
      return `Réunion ${number}`;
    default:
      return phase;
  }
}

/**
 * Format timestamp for display (HH:MM:SS)
 */
export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

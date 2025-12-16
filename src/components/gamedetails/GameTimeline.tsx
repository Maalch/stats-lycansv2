import { useState, useMemo } from 'react';
import type { GameLogEntry } from '../../hooks/useCombinedRawData';
import { 
  buildGameTimeline, 
  getEventIcon, 
  getEventLabel, 
  getPhaseDisplayName,
  formatEventTime,
  type TimelineEventType 
} from '../../utils/gameTimelineUtils';
import './GameTimeline.css';

interface GameTimelineProps {
  game: GameLogEntry;
  playerColors?: Map<string, string>;
}

interface EventFilters {
  actions: boolean;
  votes: boolean;
  deaths: boolean;
  roleChanges: boolean;
  gameEnd: boolean;
}

export function GameTimeline({ game, playerColors }: GameTimelineProps) {
  // Filter state
  const [filters, setFilters] = useState<EventFilters>({
    actions: true,
    votes: true,
    deaths: true,
    roleChanges: true,
    gameEnd: true
  });
  
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  // Build timeline data
  const timeline = useMemo(() => buildGameTimeline(game), [game]);
  
  // Filter events based on active filters
  const filteredTimeline = useMemo(() => {
    return {
      ...timeline,
      phases: timeline.phases.map(phase => ({
        ...phase,
        events: phase.events.filter(event => {
          // Filter by event type
          if (event.type === 'action' && !filters.actions) return false;
          if (event.type === 'vote' && !filters.votes) return false;
          if (event.type === 'death' && !filters.deaths) return false;
          if (event.type === 'roleChange' && !filters.roleChanges) return false;
          if (event.type === 'gameEnd' && !filters.gameEnd) return false;
          
          // Filter by selected player
          if (selectedPlayer && event.playerName !== selectedPlayer && event.type !== 'gameEnd') {
            return false;
          }
          
          return true;
        })
      })).filter(phase => phase.events.length > 0) // Remove empty phases
    };
  }, [timeline, filters, selectedPlayer]);
  
  // Toggle filter
  const toggleFilter = (filterType: keyof EventFilters) => {
    setFilters(prev => ({ ...prev, [filterType]: !prev[filterType] }));
  };
  
  // Toggle phase expansion
  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  };
  
  // Expand/collapse all phases
  const expandAll = () => {
    setExpandedPhases(new Set(filteredTimeline.phases.map(p => p.phase)));
  };
  
  const collapseAll = () => {
    setExpandedPhases(new Set());
  };
  
  // Get player color
  const getPlayerColor = (playerName: string): string => {
    if (playerColors?.has(playerName)) {
      return playerColors.get(playerName)!;
    }
    // Fallback to a default color
    return 'var(--text-secondary)';
  };
  
  // Get event type color
  const getEventTypeColor = (type: TimelineEventType): string => {
    switch (type) {
      case 'action':
        return 'var(--chart-color-1)';
      case 'vote':
        return 'var(--chart-color-3)';
      case 'death':
        return '#ff4444';
      case 'roleChange':
        return 'var(--accent-primary)';
      case 'gameEnd':
        return 'var(--accent-secondary)';
      default:
        return 'var(--text-secondary)';
    }
  };
  
  if (timeline.totalEvents === 0) {
    return (
      <div className="lycans-timeline-empty">
        <p>Aucune action enregistrée pour cette partie.</p>
      </div>
    );
  }
  
  return (
    <div className="lycans-timeline-container">
      {/* Controls */}
      <div className="lycans-timeline-controls">
        <div className="lycans-timeline-filters">
          <span className="lycans-timeline-filter-label">Afficher :</span>
          <label className="lycans-timeline-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.actions}
              onChange={() => toggleFilter('actions')}
            />
            <span>⚡ Actions</span>
          </label>
          <label className="lycans-timeline-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.votes}
              onChange={() => toggleFilter('votes')}
            />
            <span>🗳️ Votes</span>
          </label>
          <label className="lycans-timeline-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.deaths}
              onChange={() => toggleFilter('deaths')}
            />
            <span>💀 Morts</span>
          </label>
          <label className="lycans-timeline-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.roleChanges}
              onChange={() => toggleFilter('roleChanges')}
            />
            <span>🔄 Changements</span>
          </label>
        </div>
        
        <div className="lycans-timeline-player-filter">
          <label>
            <span>Filtrer par joueur :</span>
            <select 
              value={selectedPlayer || ''}
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
            >
              <option value="">Tous les joueurs</option>
              {timeline.allPlayers.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="lycans-timeline-expand-controls">
          <button onClick={expandAll} className="lycans-timeline-btn">
            Tout développer
          </button>
          <button onClick={collapseAll} className="lycans-timeline-btn">
            Tout réduire
          </button>
        </div>
      </div>
      
      {/* Event count summary */}
      <div className="lycans-timeline-summary">
        {filteredTimeline.phases.reduce((sum, phase) => sum + phase.events.length, 0)} événements
        {selectedPlayer && ` pour ${selectedPlayer}`}
      </div>
      
      {/* Timeline phases */}
      <div className="lycans-timeline-phases">
        {filteredTimeline.phases.map(phase => {
          const isExpanded = expandedPhases.has(phase.phase);
          const eventCount = phase.events.length;
          
          return (
            <div key={phase.phase} className="lycans-timeline-phase">
              <div 
                className="lycans-timeline-phase-header"
                onClick={() => togglePhase(phase.phase)}
              >
                <span className="lycans-timeline-phase-toggle">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="lycans-timeline-phase-name">
                  {getPhaseDisplayName(phase.phase)}
                </span>
                <span className="lycans-timeline-phase-count">
                  {eventCount} événement{eventCount > 1 ? 's' : ''}
                </span>
                {phase.startTime && (
                  <span className="lycans-timeline-phase-time">
                    {formatEventTime(phase.startTime)}
                  </span>
                )}
              </div>
              
              {isExpanded && (
                <div className="lycans-timeline-phase-events">
                  {phase.events.map((event, index) => (
                    <div 
                      key={`${event.timestamp}-${index}`}
                      className={`lycans-timeline-event lycans-timeline-event-${event.type}`}
                      style={{
                        borderLeftColor: getEventTypeColor(event.type)
                      }}
                    >
                      <div className="lycans-timeline-event-header">
                        <span className="lycans-timeline-event-icon">
                          {getEventIcon(event)}
                        </span>
                        {event.playerName && (
                          <span 
                            className="lycans-timeline-event-player"
                            style={{ 
                              color: getPlayerColor(event.playerName),
                              fontWeight: event.playerName === selectedPlayer ? 'bold' : 'normal'
                            }}
                          >
                            {event.playerName}
                          </span>
                        )}
                        <span className="lycans-timeline-event-label">
                          {getEventLabel(event)}
                        </span>
                        <span className="lycans-timeline-event-time">
                          {formatEventTime(event.timestamp)}
                        </span>
                      </div>
                      
                      {/* Additional details */}
                      {event.killerName && (
                        <div className="lycans-timeline-event-detail">
                          Tué par : {event.killerName}
                        </div>
                      )}
                      {event.actionTarget && (
                        <div className="lycans-timeline-event-detail">
                          Cible : {event.actionTarget}
                        </div>
                      )}
                      {event.position && (
                        <div className="lycans-timeline-event-detail lycans-timeline-event-position">
                          Position : ({Math.round(event.position.x)}, {Math.round(event.position.y)}, {Math.round(event.position.z)})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

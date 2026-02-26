import { useMemo } from 'react';

export interface BarRacePlayer {
  name: string;
  winPercent: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
  prevRank: number | null;
  rankDelta: number | null;   // positive = moved up, negative = moved down
  isNew: boolean;             // first appearance this animation frame
  isHighlightedAddition?: boolean;
}

interface MonthlyRankingBarRaceProps {
  players: BarRacePlayer[];
  playersColor: Record<string, string>;
  highlightedPlayer: string | null;
  transitionDuration: number;
  onPlayerClick: (player: string) => void;
  isFullscreen: boolean;
  isAnimating: boolean;
}

const ROW_HEIGHT = 38;
const ROW_HEIGHT_FS = 34;
const DEFAULT_BAR_COLOR = '#8884d8';

function getRankClassName(rank: number): string {
  if (rank === 0) return 'bar-race-rank--top1';
  if (rank === 1) return 'bar-race-rank--top2';
  if (rank === 2) return 'bar-race-rank--top3';
  return '';
}

function getRankEmoji(rank: number): string {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}`;
}

function getDeltaDisplay(player: BarRacePlayer, isAnimating: boolean): { text: string; className: string } {
  if (!isAnimating) {
    return { text: '', className: 'bar-race-delta--same' };
  }
  if (player.isNew) {
    return { text: '🆕', className: 'bar-race-delta--new' };
  }
  if (player.rankDelta === null || player.rankDelta === 0) {
    return { text: '—', className: 'bar-race-delta--same' };
  }
  if (player.rankDelta > 0) {
    return { text: `▲${player.rankDelta}`, className: 'bar-race-delta--up' };
  }
  return { text: `▼${Math.abs(player.rankDelta)}`, className: 'bar-race-delta--down' };
}

export function MonthlyRankingBarRace({
  players,
  playersColor,
  highlightedPlayer,
  transitionDuration,
  onPlayerClick,
  isFullscreen,
  isAnimating,
}: MonthlyRankingBarRaceProps) {
  const rowHeight = isFullscreen ? ROW_HEIGHT_FS : ROW_HEIGHT;

  // Compute scale: leader always fills 100% of the track
  const maxPercent = useMemo(() => {
    if (players.length === 0) return 100;
    const highest = Math.max(...players.map(p => p.winPercent));
    return Math.max(1, highest);
  }, [players]);

  const containerHeight = players.length * rowHeight;
  const transitionMs = `${transitionDuration}ms`;

  if (players.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: isFullscreen ? 400 : 300,
        color: 'var(--text-secondary)',
        fontSize: '1rem'
      }}>
        Aucun joueur éligible pour le moment
      </div>
    );
  }

  return (
    <div
      className="bar-race-container"
      style={{
        height: containerHeight,
        transitionDuration: transitionMs,
      }}
    >
      {players.map((player) => {
        const isHighlighted = highlightedPlayer === player.name;
        const isAddition = player.isHighlightedAddition;
        const barColor = playersColor[player.name] || DEFAULT_BAR_COLOR;
        const barWidth = maxPercent > 0 ? (player.winPercent / maxPercent) * 100 : 0;
        const yPos = player.rank * rowHeight;
        const delta = getDeltaDisplay(player, isAnimating);

        const rowClassNames = [
          'bar-race-row',
          isFullscreen ? 'bar-race-row--fullscreen' : '',
          player.isNew && isAnimating ? 'bar-race-row--entering' : '',
        ].filter(Boolean).join(' ');

        const barClassNames = [
          'bar-race-bar',
          isHighlighted ? 'bar-race-bar--highlighted' : '',
          isAddition ? 'bar-race-bar--addition' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={player.name}
            className={rowClassNames}
            style={{
              transform: `translateY(${yPos}px)`,
              transitionDuration: transitionMs,
              ['--bar-race-target-y' as string]: `${yPos}px`,
              ['--bar-race-enter-y' as string]: `${yPos + rowHeight}px`,
            }}
            onClick={() => onPlayerClick(player.name)}
          >
            {/* Rank */}
            <span className={`bar-race-rank ${getRankClassName(player.rank)}`}>
              {getRankEmoji(player.rank)}
            </span>

            {/* Player name */}
            <span className={`bar-race-label ${isHighlighted ? 'bar-race-label--highlighted' : ''}`}>
              {player.name}
            </span>

            {/* Rank delta */}
            <span className={`bar-race-delta ${delta.className}`}>
              {delta.text}
            </span>

            {/* Bar track + bar fill */}
            <div className="bar-race-track">
              <div
                className={barClassNames}
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: barColor,
                  transitionDuration: transitionMs,
                }}
              />
            </div>

            {/* Win rate & games */}
            <span className="bar-race-value">
              {player.winPercent.toFixed(1)}%
            </span>
            <span className="bar-race-games">
              {player.wins}/{player.gamesPlayed}
            </span>
          </div>
        );
      })}
    </div>
  );
}

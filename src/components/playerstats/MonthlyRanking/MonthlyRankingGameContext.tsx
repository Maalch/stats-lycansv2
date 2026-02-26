import type { GameLogEntry } from '../../../hooks/useCombinedRawData';
import { getPlayerMainCampFromRole } from '../../../utils/datasyncExport';

interface MonthlyRankingGameContextProps {
  game: GameLogEntry;
  onGameClick: (gameId: string) => void;
}

function getWinningCamp(game: GameLogEntry): { camp: string; className: string; emoji: string } {
  // Find a victorious player and determine their camp
  const winner = game.PlayerStats.find(p => p.Victorious);
  if (!winner) {
    return { camp: 'Inconnu', className: '', emoji: '❓' };
  }

  const mainCamp = getPlayerMainCampFromRole(winner.MainRoleInitial, winner.Power);
  
  switch (mainCamp) {
    case 'Loup':
      return { camp: 'Loups', className: 'game-context-winner--loups', emoji: '🐺' };
    case 'Villageois':
      return { camp: 'Villageois', className: 'game-context-winner--villageois', emoji: '🏘️' };
    default:
      // Solo or other roles - use the actual role name
      return { camp: winner.MainRoleInitial, className: 'game-context-winner--solo', emoji: '🎭' };
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function MonthlyRankingGameContext({ game, onGameClick }: MonthlyRankingGameContextProps) {
  const { camp, className, emoji } = getWinningCamp(game);
  const playerCount = game.PlayerStats.length;
  const winners = game.PlayerStats.filter(p => p.Victorious).map(p => p.Username);

  return (
    <div className="game-context-panel">
      <span
        className="game-context-id"
        onClick={() => onGameClick(game.DisplayedId)}
        title="Voir les détails de la partie"
      >
        #{game.DisplayedId}
      </span>

      <span className="game-context-separator">|</span>

      <span className="game-context-map">
        📍 {game.MapName}
      </span>

      <span className="game-context-separator">|</span>

      <span className={`game-context-winner ${className}`}>
        {emoji} {camp}
      </span>

      <span className="game-context-separator">|</span>

      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        {formatDate(game.StartDate)} · {playerCount}j
        {game.EndTiming ? ` · ${game.EndTiming}` : ''}
      </span>

      <span className="game-context-separator">|</span>

      <span className="game-context-players">
        Gagnants:{' '}
        {winners.length > 0 
          ? winners.map((name, i) => (
              <span key={name}>
                {i > 0 && ', '}
                <span className="game-context-player--won">{name}</span>
              </span>
            ))
          : <span style={{ fontStyle: 'italic' }}>Aucun</span>
        }
      </span>
    </div>
  );
}

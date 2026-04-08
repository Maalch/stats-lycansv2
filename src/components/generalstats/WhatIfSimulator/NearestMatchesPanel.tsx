import { useState } from 'react';
import type { NearestMatch } from '../../../types/whatIfSimulator';
import { useNavigation } from '../../../context/NavigationContext';

interface NearestMatchesPanelProps {
  matches: NearestMatch[];
}

function getWinnerClass(camp: string): string {
  if (camp === 'Villageois') return 'villageois';
  if (camp === 'Loup') return 'loup';
  return 'solo';
}

export function NearestMatchesPanel({ matches }: NearestMatchesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToGameDetails } = useNavigation();

  if (matches.length === 0) return null;

  return (
    <div className="whatif-nearest">
      <div
        className="whatif-nearest-header"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className="whatif-nearest-title">
          📊 Parties les plus similaires ({matches.length})
        </span>
        <span className={`whatif-nearest-toggle ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="whatif-nearest-body">
          <table className="whatif-nearest-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueurs</th>
                <th>Composition</th>
                <th>Vainqueur</th>
                <th>Similarité</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr
                  key={match.gameId}
                  onClick={() => navigateToGameDetails({ selectedGame: match.displayedId })}
                  title={`Voir la partie ${match.displayedId}`}
                >
                  <td>{match.displayedId}</td>
                  <td>{match.playerCount}</td>
                  <td>
                    🟢{match.villageoisCount} 🔴{match.wolfCount} 🟡{match.soloCount}
                  </td>
                  <td>
                    <span className={`whatif-winner-badge ${getWinnerClass(match.winnerCamp)}`}>
                      {match.winnerCamp}
                    </span>
                  </td>
                  <td>
                    <span className="whatif-similarity-bar">
                      <span
                        className="whatif-similarity-fill"
                        style={{ width: `${match.similarity * 100}%` }}
                      />
                    </span>
                    {(match.similarity * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

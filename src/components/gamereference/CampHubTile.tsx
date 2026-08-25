import type { CampEntry } from '../../hooks/useGameReference';

interface CampHubTileProps {
  camp: CampEntry;
  roleCount: number;
  onClick: () => void;
  powerCount?: number;
}

export function CampHubTile({ camp, roleCount, onClick, powerCount }: CampHubTileProps) {
  return (
    <button
      className={`ref-hub-tile ref-hub-tile--${camp.id}`}
      onClick={onClick}
      type="button"
      aria-label={`Explorer le camp ${camp.name}`}
    >
      <div className="ref-hub-tile__emoji">{camp.emoji}</div>
      <div className="ref-hub-tile__content">
        <h3 className="ref-hub-tile__name">{camp.name}</h3>
        <p className="ref-hub-tile__description">{camp.description}</p>
        <div className="ref-hub-tile__meta">
          <span className="ref-hub-tile__role-count">
            {roleCount} rôle{roleCount > 1 ? 's' : ''}
          </span>
          {powerCount !== undefined && powerCount > 0 && (
            <span className="ref-hub-tile__power-count">
              {powerCount} pouvoir{powerCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="ref-hub-tile__win-condition">
            🏆 {camp.winCondition}
          </span>
        </div>
      </div>
      <div className="ref-hub-tile__arrow">›</div>
    </button>
  );
}

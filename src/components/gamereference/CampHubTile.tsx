import type { CampEntry, MainRoleEntry } from '../../hooks/useGameReference';

interface CampHubTileProps {
  camp: CampEntry;
  roles: MainRoleEntry[];
  onClick: () => void;
  powerCount?: number;
}

export function CampHubTile({ camp, roles, onClick, powerCount }: CampHubTileProps) {
  const displayCount = powerCount ?? roles.length;
  const label = powerCount !== undefined ? `${displayCount} pouvoir${displayCount > 1 ? 's' : ''}` : `${displayCount} rôle${displayCount > 1 ? 's' : ''}`;
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
            {label}
          </span>
          <span className="ref-hub-tile__win-condition">
            🏆 {camp.winCondition}
          </span>
        </div>
      </div>
      <div className="ref-hub-tile__arrow">›</div>
    </button>
  );
}

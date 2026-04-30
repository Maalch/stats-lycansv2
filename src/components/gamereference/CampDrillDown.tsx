import { useState } from 'react';
import type {
  CampEntry,
  MainRoleEntry,
  PowerEntry,
  SecondaryRoleEntry,
  DeadRoleEntry,
} from '../../hooks/useGameReference';
import { RelatedItemsChips } from './RelatedItemsChips';

// ============================================
// Props
// ============================================
interface CampDrillDownProps {
  camp: CampEntry;
  mainRoles: MainRoleEntry[];
  wolfPowers: PowerEntry[];
  villagerPowers: PowerEntry[];
  elitePowers: PowerEntry[];
  secondaryRoles: SecondaryRoleEntry[];
  deadRoles: DeadRoleEntry[];
  searchTerms: string[];
}

// ============================================
// Sub-filter pills for within-camp navigation
// ============================================
type VillageoisFilter = 'all' | 'roles' | 'metiers' | 'elite';
type LoupFilter = 'all' | 'roles' | 'pouvoirs';


// ============================================
// Expandable role card
// ============================================
function ExpandableRoleCard({ role, children }: { role: MainRoleEntry; children?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`ref-card ref-card--role ref-card--${role.camp} ref-card--expandable${expanded ? ' ref-card--expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      aria-expanded={expanded}
    >
      <div className="ref-card__header">
        <span className="ref-card__emoji">{role.emoji}</span>
        <h3 className="ref-card__title">{role.name}</h3>
        {role.type && (
          <span className="ref-card__badge">{role.type}</span>
        )}
        <span className={`ref-card__expand-icon${expanded ? ' ref-card__expand-icon--open' : ''}`}>▾</span>
      </div>
      <p className="ref-card__description">
        {expanded ? role.description : (role.descriptionShort || role.description)}
      </p>
      {expanded && (
        <div className="ref-card__expanded-content">
          {role.subRoles && (
            <div className="ref-card__subroles">
              {role.subRoles.map(sub => (
                <span key={sub.id} className="ref-card__subrole-tag">{sub.name}</span>
              ))}
            </div>
          )}
          <RelatedItemsChips items={role.relatedItems} />
          {children}
        </div>
      )}
    </div>
  );
}

function ExpandablePowerCard({ power, variant }: { power: PowerEntry; variant: 'wolf' | 'villager' | 'elite' }) {
  const [expanded, setExpanded] = useState(false);
  const variantClass = `ref-card--${variant}`;

  return (
    <div
      className={`ref-card ref-card--power ${variantClass} ref-card--expandable${expanded ? ' ref-card--expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      aria-expanded={expanded}
    >
      <div className="ref-card__header">
        <span className="ref-card__emoji">{power.emoji}</span>
        <h3 className="ref-card__title">{power.name}</h3>
        <span className={`ref-card__expand-icon${expanded ? ' ref-card__expand-icon--open' : ''}`}>▾</span>
      </div>
      <p className="ref-card__description">
        {expanded ? power.description : (power.descriptionShort || power.description)}
      </p>
      {expanded && power.relatedItems && (
        <div className="ref-card__expanded-content">
          <RelatedItemsChips items={power.relatedItems} />
        </div>
      )}
    </div>
  );
}

// ============================================
// Camp Drill-Down: Villageois
// ============================================
function VillageoisDrillDown({
  mainRoles, villagerPowers, elitePowers, secondaryRoles, deadRoles
}: {
  mainRoles: MainRoleEntry[];
  villagerPowers: PowerEntry[];
  elitePowers: PowerEntry[];
  secondaryRoles: SecondaryRoleEntry[];
  deadRoles: DeadRoleEntry[];
}) {
  const [filter, setFilter] = useState<VillageoisFilter>('all');

  const villageoisRoles = mainRoles.filter(r => r.camp === 'villageois');
  const villageoisSecondary = secondaryRoles; // Secondary roles can apply to any camp
  const villageoisDead = deadRoles.filter(r => r.camp === 'villageois');

  const showRoles = filter === 'all' || filter === 'roles';
  const showMetiers = filter === 'all' || filter === 'metiers';
  const showElite = filter === 'all' || filter === 'elite';

  return (
    <div className="ref-drilldown ref-drilldown--villageois">
      {/* Role hierarchy visual */}
      <div className="ref-hierarchy">
        <div className="ref-hierarchy__node ref-hierarchy__node--root">🏘️ Camp Villageois</div>
        <div className="ref-hierarchy__branches">
          <div className="ref-hierarchy__branch">
            <span className="ref-hierarchy__node">👤 Villageois</span>
            <span className="ref-hierarchy__leaf">+ Métiers ({villagerPowers.length})</span>
          </div>
          <div className="ref-hierarchy__branch">
            <span className="ref-hierarchy__node">⭐ Villageois Élite</span>
            <span className="ref-hierarchy__leaf">+ Pouvoirs ({elitePowers.length})</span>
          </div>
        </div>
      </div>

      {/* Sub-filter pills */}
      <div className="lycans-categories-selection ref-subfilter">
        {([
          ['all', 'Tous'],
          ['roles', `Rôles (${villageoisRoles.length})`],
          ['metiers', `Métiers (${villagerPowers.length})`],
          ['elite', `Pouvoirs Élite (${elitePowers.length})`],
        ] as [VillageoisFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`lycans-categorie-btn${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roles */}
      {showRoles && villageoisRoles.length > 0 && (
        <div className="ref-section">
          <h3 className="ref-section__title">
            <span>Rôles Principaux</span>
            <span className="ref-section__count">{villageoisRoles.length}</span>
          </h3>
          <div className="ref-grid">
            {villageoisRoles.map(role => (
              <ExpandableRoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      )}

      {/* Villager Powers (Métiers) */}
      {showMetiers && villagerPowers.length > 0 && (
        <div className="ref-section">
          <h3 className="ref-section__title">
            <span>Métiers de Villageois 👤</span>
            <span className="ref-section__count">{villagerPowers.length}</span>
          </h3>
          <p className="ref-section__subtitle">
            Pouvoirs spéciaux (métiers) assignés aux Villageois de base.
          </p>
          <div className="ref-grid">
            {villagerPowers.map(p => (
              <ExpandablePowerCard key={p.id} power={p} variant="villager" />
            ))}
          </div>
        </div>
      )}

      {/* Elite Powers */}
      {showElite && elitePowers.length > 0 && (
        <div className="ref-section">
          <h3 className="ref-section__title">
            <span>Pouvoirs d'Élite ⭐</span>
            <span className="ref-section__count">{elitePowers.length}</span>
          </h3>
          <p className="ref-section__subtitle">
            Pouvoirs réservés aux Villageois Élite. Doivent utiliser une balle pour charger.
          </p>
          <div className="ref-grid">
            {elitePowers.map(p => (
              <ExpandablePowerCard key={p.id} power={p} variant="elite" />
            ))}
          </div>
        </div>
      )}

      {/* Related: secondary roles and dead roles for this camp */}
      {filter === 'all' && villageoisSecondary.length > 0 && (
        <div className="ref-section ref-section--related">
          <h3 className="ref-section__title">
            <span>🔄 Rôles Secondaires (Villageois et Loups seulement)</span>
            <span className="ref-section__count">{villageoisSecondary.length}</span>
          </h3>
          <p className="ref-section__subtitle">
            Assignés en plus du rôle principal. Effets spécifiques pour les Villageois indiqués.
          </p>
          <div className="ref-grid">
            {villageoisSecondary.map(r => (
              <div key={r.id} className="ref-card ref-card--secondary">
                <div className="ref-card__header">
                  <span className="ref-card__emoji">{r.emoji}</span>
                  <h3 className="ref-card__title">{r.name}</h3>
                </div>
                <p className="ref-card__description">{r.descriptionShort || r.description}</p>
                {r.descriptionVillager && (
                  <div className="ref-card__variant">
                    <span className="ref-card__variant-label">🏘️ Villageois :</span>
                    <span>{r.descriptionVillager}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filter === 'all' && villageoisDead.length > 0 && (
        <div className="ref-section ref-section--related">
          <h3 className="ref-section__title">
            <span>👻 Rôles de Mort (Villageois)</span>
            <span className="ref-section__count">{villageoisDead.length}</span>
          </h3>
          <div className="ref-grid">
            {villageoisDead.map(r => (
              <div key={r.id} className="ref-card ref-card--dead">
                <div className="ref-card__header">
                  <span className="ref-card__emoji">{r.emoji}</span>
                  <h3 className="ref-card__title">{r.name}</h3>
                </div>
                <p className="ref-card__description">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Camp Drill-Down: Loups
// ============================================
function LoupDrillDown({
  mainRoles, wolfPowers, secondaryRoles, deadRoles
}: {
  mainRoles: MainRoleEntry[];
  wolfPowers: PowerEntry[];
  secondaryRoles: SecondaryRoleEntry[];
  deadRoles: DeadRoleEntry[];
}) {
  const [filter, setFilter] = useState<LoupFilter>('all');

  const loupRoles = mainRoles.filter(r => r.camp === 'loup');
  const loupDead = deadRoles.filter(r => r.camp === 'loup');

  const showRoles = filter === 'all' || filter === 'roles';
  const showPowers = filter === 'all' || filter === 'pouvoirs';

  return (
    <div className="ref-drilldown ref-drilldown--loup">
      {/* Role hierarchy visual */}
      <div className="ref-hierarchy">
        <div className="ref-hierarchy__node ref-hierarchy__node--root">🐺 Camp Loups</div>
        <div className="ref-hierarchy__branches">
          <div className="ref-hierarchy__branch">
            <span className="ref-hierarchy__node">🐺 Loup</span>
            <span className="ref-hierarchy__leaf">+ Pouvoirs ({wolfPowers.length})</span>
          </div>
          <div className="ref-hierarchy__branch">
            <span className="ref-hierarchy__node">🗡️ Traître</span>
            <span className="ref-hierarchy__leaf">forme humaine</span>
          </div>
          <div className="ref-hierarchy__branch">
            <span className="ref-hierarchy__node">🐾 Louveteau</span>
            <span className="ref-hierarchy__leaf">remplaçant</span>
          </div>
        </div>
      </div>

      {/* Sub-filter pills */}
      <div className="lycans-categories-selection ref-subfilter">
        {([
          ['all', 'Tous'],
          ['roles', `Rôles (${loupRoles.length})`],
          ['pouvoirs', `Pouvoirs (${wolfPowers.length})`],
        ] as [LoupFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`lycans-categorie-btn${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roles */}
      {showRoles && loupRoles.length > 0 && (
        <div className="ref-section">
          <h3 className="ref-section__title">
            <span>Rôles Principaux</span>
            <span className="ref-section__count">{loupRoles.length}</span>
          </h3>
          <div className="ref-grid">
            {loupRoles.map(role => (
              <ExpandableRoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      )}

      {/* Wolf Powers */}
      {showPowers && wolfPowers.length > 0 && (
        <div className="ref-section">
          <h3 className="ref-section__title">
            <span>Pouvoirs de Loup 🐺</span>
            <span className="ref-section__count">{wolfPowers.length}</span>
          </h3>
          <p className="ref-section__subtitle">
            Pouvoirs spéciaux assignés aux Loups en plus de leur rôle principal.
          </p>
          <div className="ref-grid">
            {wolfPowers.map(p => (
              <ExpandablePowerCard key={p.id} power={p} variant="wolf" />
            ))}
          </div>
        </div>
      )}

      {/* Related: secondary roles (wolf-specific descriptions) */}
      {filter === 'all' && secondaryRoles.length > 0 && (
        <div className="ref-section ref-section--related">
          <h3 className="ref-section__title">
            <span>🔄 Rôles Secondaires (Villageois et Loups seulement)</span>
            <span className="ref-section__count">{secondaryRoles.length}</span>
          </h3>
          <p className="ref-section__subtitle">
            Assignés en plus du rôle principal. Effets spécifiques pour les Loups indiqués.
          </p>
          <div className="ref-grid">
            {secondaryRoles.map(r => (
              <div key={r.id} className="ref-card ref-card--secondary">
                <div className="ref-card__header">
                  <span className="ref-card__emoji">{r.emoji}</span>
                  <h3 className="ref-card__title">{r.name}</h3>
                </div>
                <p className="ref-card__description">{r.descriptionShort || r.description}</p>
                {r.descriptionWolf && (
                  <div className="ref-card__variant">
                    <span className="ref-card__variant-label">🐺 Loup :</span>
                    <span>{r.descriptionWolf}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filter === 'all' && loupDead.length > 0 && (
        <div className="ref-section ref-section--related">
          <h3 className="ref-section__title">
            <span>👻 Rôles de Mort (Loups)</span>
            <span className="ref-section__count">{loupDead.length}</span>
          </h3>
          <div className="ref-grid">
            {loupDead.map(r => (
              <div key={r.id} className="ref-card ref-card--dead">
                <div className="ref-card__header">
                  <span className="ref-card__emoji">{r.emoji}</span>
                  <h3 className="ref-card__title">{r.name}</h3>
                </div>
                <p className="ref-card__description">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Camp Drill-Down: Solo
// ============================================
function SoloDrillDown({ mainRoles }: { mainRoles: MainRoleEntry[] }) {
  const soloRoles = mainRoles.filter(r => r.camp === 'solo');

  return (
    <div className="ref-drilldown ref-drilldown--solo">
      <div className="ref-section">
        <h3 className="ref-section__title">
          <span>Rôles Solo</span>
          <span className="ref-section__count">{soloRoles.length}</span>
        </h3>
        <div className="ref-grid ref-grid--solo">
          {soloRoles.map(role => (
            <SoloRoleCard key={role.id} role={role} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Solo Role Card (larger, win-condition prominent)
// ============================================
function SoloRoleCard({ role }: { role: MainRoleEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`ref-card ref-card--solo-role ref-card--expandable${expanded ? ' ref-card--expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      aria-expanded={expanded}
    >
      <div className="ref-card__header">
        <span className="ref-card__emoji">{role.emoji}</span>
        <h3 className="ref-card__title">{role.name}</h3>
        <span className={`ref-card__expand-icon${expanded ? ' ref-card__expand-icon--open' : ''}`}>▾</span>
      </div>
      <div className="ref-card__win-condition">
        🏆 {role.descriptionShort || 'Condition de victoire unique'}
      </div>
      {expanded && (
        <div className="ref-card__expanded-content">
          <p className="ref-card__description">{role.description}</p>
          {role.subRoles && (
            <div className="ref-card__subroles">
              {role.subRoles.map(sub => (
                <span key={sub.id} className="ref-card__subrole-tag">{sub.name}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main export
// ============================================
export function CampDrillDown({ camp, mainRoles, wolfPowers, villagerPowers, elitePowers, secondaryRoles, deadRoles }: CampDrillDownProps) {
  // Suppress unused searchTerms for now — will be used for highlighting later
  switch (camp.id) {
    case 'villageois':
      return (
        <VillageoisDrillDown
          mainRoles={mainRoles}
          villagerPowers={villagerPowers}
          elitePowers={elitePowers}
          secondaryRoles={secondaryRoles}
          deadRoles={deadRoles}
        />
      );
    case 'loup':
      return (
        <LoupDrillDown
          mainRoles={mainRoles}
          wolfPowers={wolfPowers}
          secondaryRoles={secondaryRoles}
          deadRoles={deadRoles}
        />
      );
    case 'solo':
      return <SoloDrillDown mainRoles={mainRoles} />;
    default:
      return null;
  }
}

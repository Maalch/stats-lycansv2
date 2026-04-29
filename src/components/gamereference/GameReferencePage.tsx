import { useState, useMemo } from 'react';
import { useGameReference } from '../../hooks/useGameReference';
import type {
  CampEntry,
  MainRoleEntry,
  PowerEntry,
  SecondaryRoleEntry,
  DeadRoleEntry,
  AccessoryEntry,
  GadgetEntry,
  PotionEffectEntry,
  StatusEffectEntry,
  EventEntry,
  SabotageEntry,
} from '../../hooks/useGameReference';
import './GameReferencePage.css';

// ============================================
// Category definitions for the sub-navigation
// ============================================
const CATEGORIES = [
  { key: 'camps', label: 'Camps & Rôles', icon: '🏘️' },
  { key: 'wolfPowers', label: 'Pouvoirs de Loup', icon: '🐺' },
  { key: 'villagerPowers', label: 'Pouvoirs de Villageois', icon: '👤' },
  { key: 'elitePowers', label: 'Pouvoirs Élite', icon: '⭐' },
  { key: 'secondaryRoles', label: 'Rôles Secondaires', icon: '🔄' },
  { key: 'deadRoles', label: 'Rôles de Mort', icon: '👻' },
  { key: 'accessories', label: 'Accessoires', icon: '💍' },
  { key: 'gadgets', label: 'Gadgets & Objets', icon: '🧪' },
  { key: 'effects', label: 'Effets & Potions', icon: '✨' },
  { key: 'events', label: 'Événements', icon: '⚡' },
  { key: 'sabotages', label: 'Sabotages', icon: '💣' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// ============================================
// Card rendering components
// ============================================

function CampCard({ camp }: { camp: CampEntry }) {
  return (
    <div className="ref-card ref-card--camp">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{camp.emoji}</span>
        <h3 className="ref-card__title">{camp.name}</h3>
      </div>
      <p className="ref-card__description">{camp.description}</p>
      <div className="ref-card__detail">
        <span className="ref-card__label">🏆 Condition de victoire :</span>
        <span>{camp.winCondition}</span>
      </div>
      <div className="ref-card__detail">
        <span className="ref-card__label">Rôles :</span>
        <span>{camp.roles.join(', ')}</span>
      </div>
    </div>
  );
}

function MainRoleCard({ role }: { role: MainRoleEntry }) {
  const campLabel = role.camp === 'villageois' ? '🏘️ Villageois' :
                    role.camp === 'loup' ? '🐺 Loup' : '🎭 Solo';
  return (
    <div className={`ref-card ref-card--role ref-card--${role.camp}`}>
      <div className="ref-card__header">
        <span className="ref-card__emoji">{role.emoji}</span>
        <h3 className="ref-card__title">{role.name}</h3>
        <span className="ref-card__badge">{campLabel}</span>
      </div>
      <p className="ref-card__description">{role.description}</p>
      {role.subRoles && (
        <div className="ref-card__subroles">
          {role.subRoles.map(sub => (
            <span key={sub.id} className="ref-card__subrole-tag">{sub.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PowerCard({ power, variant }: { power: PowerEntry; variant: 'wolf' | 'villager' | 'elite' }) {
  const variantClass = `ref-card--${variant}`;
  return (
    <div className={`ref-card ref-card--power ${variantClass}`}>
      <div className="ref-card__header">
        <span className="ref-card__emoji">{power.emoji}</span>
        <h3 className="ref-card__title">{power.name}</h3>
      </div>
      <p className="ref-card__description">{power.description}</p>
    </div>
  );
}

function SecondaryRoleCard({ role }: { role: SecondaryRoleEntry }) {
  return (
    <div className="ref-card ref-card--secondary">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{role.emoji}</span>
        <h3 className="ref-card__title">{role.name}</h3>
      </div>
      <p className="ref-card__description">{role.description}</p>
      {(role.descriptionVillager || role.descriptionWolf) && (
        <div className="ref-card__variants">
          {role.descriptionVillager && (
            <div className="ref-card__variant">
              <span className="ref-card__variant-label">🏘️ Villageois :</span>
              <span>{role.descriptionVillager}</span>
            </div>
          )}
          {role.descriptionWolf && (
            <div className="ref-card__variant">
              <span className="ref-card__variant-label">🐺 Loup :</span>
              <span>{role.descriptionWolf}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeadRoleCard({ role }: { role: DeadRoleEntry }) {
  const campIcon = role.camp === 'villageois' ? '🏘️' : role.camp === 'loup' ? '🐺' : '💀';
  return (
    <div className="ref-card ref-card--dead">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{role.emoji}</span>
        <h3 className="ref-card__title">{role.name}</h3>
        <span className="ref-card__badge">{campIcon} {role.camp}</span>
      </div>
      <p className="ref-card__description">{role.description}</p>
    </div>
  );
}

function AccessoryCard({ accessory }: { accessory: AccessoryEntry }) {
  return (
    <div className="ref-card ref-card--accessory">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{accessory.emoji}</span>
        <h3 className="ref-card__title">{accessory.name}</h3>
      </div>
      <p className="ref-card__description">{accessory.description}</p>
      <div className="ref-card__detail ref-card__detail--tinkerer">
        <span className="ref-card__label">🔩 Bricoleur :</span>
        <span>{accessory.tinkererEffect}</span>
      </div>
    </div>
  );
}

function GadgetCard({ gadget }: { gadget: GadgetEntry }) {
  return (
    <div className="ref-card ref-card--gadget">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{gadget.emoji}</span>
        <h3 className="ref-card__title">{gadget.name}</h3>
      </div>
      <p className="ref-card__description">{gadget.description}</p>
      {gadget.gasTypes && (
        <div className="ref-card__subtags">
          {gadget.gasTypes.map(gas => (
            <span key={gas.id} className="ref-card__subrole-tag">{gas.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function EffectCard({ effect, type }: { effect: PotionEffectEntry | StatusEffectEntry; type: 'potion' | 'status' }) {
  const potionEffect = type === 'potion' ? effect as PotionEffectEntry : null;
  const potionType = potionEffect?.type;
  const typeClass = potionType === 'positive' ? 'ref-effect--positive' :
                    potionType === 'negative' ? 'ref-effect--negative' :
                    potionType === 'neutral' ? 'ref-effect--neutral' : '';
  return (
    <div className={`ref-effect-tag ${typeClass}`}>
      <span className="ref-effect-tag__name">{effect.name}</span>
      {potionType && <span className="ref-effect-tag__type">{potionType}</span>}
      {effect.tutorial && <span className="ref-effect-tag__tutorial">{effect.tutorial}</span>}
    </div>
  );
}

function EventCard({ event }: { event: EventEntry }) {
  return (
    <div className="ref-card ref-card--event">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{event.emoji}</span>
        <h3 className="ref-card__title">{event.name}</h3>
      </div>
      <p className="ref-card__description">{event.description}</p>
    </div>
  );
}

function SabotageCard({ sabotage }: { sabotage: SabotageEntry }) {
  return (
    <div className="ref-card ref-card--sabotage">
      <div className="ref-card__header">
        <span className="ref-card__emoji">{sabotage.emoji}</span>
        <h3 className="ref-card__title">{sabotage.name}</h3>
      </div>
      <p className="ref-card__description">{sabotage.description}</p>
      {sabotage.mapSpecific && (
        <div className="ref-card__detail">
          <span className="ref-card__label">🗺️ Carte :</span>
          <span>{sabotage.mapSpecific}</span>
        </div>
      )}
      {sabotage.objects && (
        <div className="ref-card__subtags">
          {sabotage.objects.map(obj => (
            <span key={obj} className="ref-card__subrole-tag">{obj}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Search helper
// ============================================
function matchesSearch(searchTerm: string, ...fields: (string | undefined | null)[]): boolean {
  if (!searchTerm) return true;
  const lower = searchTerm.toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(lower));
}

// ============================================
// Main page component
// ============================================
export function GameReferencePage() {
  const { data, isLoading, error } = useGameReference();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('camps');
  const [searchTerm, setSearchTerm] = useState('');

  // Count matching items per category for badges
  const categoryCounts = useMemo(() => {
    if (!data || !searchTerm) return null;
    const counts: Partial<Record<CategoryKey, number>> = {};

    counts.camps = data.camps.filter(c => matchesSearch(searchTerm, c.name, c.description, c.winCondition)).length
      + data.mainRoles.filter(r => matchesSearch(searchTerm, r.name, r.description, r.descriptionShort)).length;
    counts.wolfPowers = data.wolfPowers.filter(p => matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)).length;
    counts.villagerPowers = data.villagerPowers.filter(p => matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)).length;
    counts.elitePowers = data.elitePowers.filter(p => matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)).length;
    counts.secondaryRoles = data.secondaryRoles.filter(r => matchesSearch(searchTerm, r.name, r.description, r.descriptionVillager, r.descriptionWolf)).length;
    counts.deadRoles = data.deadRoles.filter(r => matchesSearch(searchTerm, r.name, r.description)).length;
    counts.accessories = data.accessories.filter(a => matchesSearch(searchTerm, a.name, a.description, a.tinkererEffect)).length;
    counts.gadgets = data.gadgets.filter(g => matchesSearch(searchTerm, g.name, g.description)).length;
    counts.effects = data.potionEffects.filter(e => matchesSearch(searchTerm, e.name, e.tutorial)).length
      + data.statusEffects.filter(e => matchesSearch(searchTerm, e.name, e.tutorial)).length;
    counts.events = data.events.filter(e => matchesSearch(searchTerm, e.name, e.description)).length;
    counts.sabotages = data.sabotages.filter(s => matchesSearch(searchTerm, s.name, s.description)).length;

    return counts;
  }, [data, searchTerm]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!data) return <div>Aucune donnée disponible</div>;

  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'camps': {
        const filteredCamps = data.camps.filter(c =>
          matchesSearch(searchTerm, c.name, c.description, c.winCondition)
        );
        const filteredRoles = data.mainRoles.filter(r =>
          matchesSearch(searchTerm, r.name, r.description, r.descriptionShort)
        );
        return (
          <>
            {filteredCamps.length > 0 && (
              <div className="ref-section">
                <h2 className="ref-section__title">Camps</h2>
                <div className="ref-grid ref-grid--camps">
                  {filteredCamps.map(camp => (
                    <CampCard key={camp.id} camp={camp} />
                  ))}
                </div>
              </div>
            )}
            {filteredRoles.length > 0 && (
              <div className="ref-section">
                <h2 className="ref-section__title">Rôles Principaux</h2>
                <div className="ref-grid">
                  {filteredRoles.map(role => (
                    <MainRoleCard key={role.id} role={role} />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }

      case 'wolfPowers': {
        const filtered = data.wolfPowers.filter(p =>
          matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Pouvoirs de Loup 🐺</h2>
            <p className="ref-section__subtitle">Pouvoirs spéciaux assignés aux Loups en plus de leur rôle principal.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="wolf" />)}
            </div>
          </div>
        );
      }

      case 'villagerPowers': {
        const filtered = data.villagerPowers.filter(p =>
          matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Métiers de Villageois 👤</h2>
            <p className="ref-section__subtitle">Pouvoirs spéciaux (métiers) assignés aux Villageois de base.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="villager" />)}
            </div>
          </div>
        );
      }

      case 'elitePowers': {
        const filtered = data.elitePowers.filter(p =>
          matchesSearch(searchTerm, p.name, p.description, p.descriptionShort)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Pouvoirs d'Élite ⭐</h2>
            <p className="ref-section__subtitle">Pouvoirs spéciaux réservés aux Villageois Élite. Doivent utiliser une balle pour charger leur pouvoir.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="elite" />)}
            </div>
          </div>
        );
      }

      case 'secondaryRoles': {
        const filtered = data.secondaryRoles.filter(r =>
          matchesSearch(searchTerm, r.name, r.description, r.descriptionVillager, r.descriptionWolf)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Rôles Secondaires 🔄</h2>
            <p className="ref-section__subtitle">Assignés en plus du rôle principal. Peuvent avoir des effets différents selon que le joueur est Villageois ou Loup.</p>
            <div className="ref-grid">
              {filtered.map(r => <SecondaryRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      }

      case 'deadRoles': {
        const filtered = data.deadRoles.filter(r =>
          matchesSearch(searchTerm, r.name, r.description)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Rôles de Mort 👻</h2>
            <p className="ref-section__subtitle">Rôles attribués aux joueurs après leur mort, leur permettant de continuer à influencer la partie.</p>
            <div className="ref-grid">
              {filtered.map(r => <DeadRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      }

      case 'accessories': {
        const filtered = data.accessories.filter(a =>
          matchesSearch(searchTerm, a.name, a.description, a.tinkererEffect)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Accessoires 💍</h2>
            <p className="ref-section__subtitle">Équipements passifs trouvés dans le jeu. Le rôle secondaire Bricoleur peut les activer pour un effet spécial.</p>
            <div className="ref-grid">
              {filtered.map(a => <AccessoryCard key={a.id} accessory={a} />)}
            </div>
          </div>
        );
      }

      case 'gadgets': {
        const filtered = data.gadgets.filter(g =>
          matchesSearch(searchTerm, g.name, g.description)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Gadgets & Objets 🧪</h2>
            <p className="ref-section__subtitle">Objets utilisables trouvés ou fabriqués pendant la partie.</p>
            <div className="ref-grid">
              {filtered.map(g => <GadgetCard key={g.id} gadget={g} />)}
            </div>
          </div>
        );
      }

      case 'effects': {
        const filteredPotions = data.potionEffects.filter(e =>
          matchesSearch(searchTerm, e.name, e.tutorial)
        );
        const filteredStatus = data.statusEffects.filter(e =>
          matchesSearch(searchTerm, e.name, e.tutorial)
        );
        return (
          <>
            {filteredPotions.length > 0 && (
              <div className="ref-section">
                <h2 className="ref-section__title">Effets de Potions 🧪</h2>
                <p className="ref-section__subtitle">Effets applicables via les potions trouvées en jeu.</p>
                <div className="ref-effects-grid">
                  {filteredPotions.map(e => <EffectCard key={e.id} effect={e} type="potion" />)}
                </div>
              </div>
            )}
            {filteredStatus.length > 0 && (
              <div className="ref-section">
                <h2 className="ref-section__title">Effets de Statut ✨</h2>
                <p className="ref-section__subtitle">Tous les effets de statut pouvant affecter les joueurs pendant la partie.</p>
                <div className="ref-effects-grid">
                  {filteredStatus.map(e => <EffectCard key={e.id} effect={e} type="status" />)}
                </div>
              </div>
            )}
          </>
        );
      }

      case 'events': {
        const filtered = data.events.filter(e =>
          matchesSearch(searchTerm, e.name, e.description)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Événements ⚡</h2>
            <p className="ref-section__subtitle">Événements aléatoires pouvant survenir pendant une journée, affectant tous les joueurs.</p>
            <div className="ref-grid">
              {filtered.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        );
      }

      case 'sabotages': {
        const filtered = data.sabotages.filter(s =>
          matchesSearch(searchTerm, s.name, s.description)
        );
        return (
          <div className="ref-section">
            <h2 className="ref-section__title">Sabotages 💣</h2>
            <p className="ref-section__subtitle">Actions de sabotage disponibles pour les Loups, utilisant des éléments du décor.</p>
            <div className="ref-grid">
              {filtered.map(s => <SabotageCard key={s.id} sabotage={s} />)}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="game-reference-page">
      {/* Search bar */}
      <div className="ref-search-container">
        <input
          type="text"
          className="ref-search-input"
          placeholder="🔍 Rechercher un rôle, pouvoir, objet, effet..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="ref-search-clear"
            onClick={() => setSearchTerm('')}
            type="button"
            title="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category sub-navigation */}
      <nav className="lycans-categories-selection">
        {CATEGORIES.map(cat => {
          const count = categoryCounts?.[cat.key];
          const hasResults = !searchTerm || (count !== undefined && count > 0);
          return (
            <button
              key={cat.key}
              className={`lycans-categorie-btn${selectedCategory === cat.key ? ' active' : ''}${!hasResults ? ' ref-cat-empty' : ''}`}
              onClick={() => setSelectedCategory(cat.key)}
              type="button"
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {searchTerm && count !== undefined && (
                <span className="ref-cat-count">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Category content */}
      <div className="ref-content">
        {renderCategoryContent()}
      </div>
    </div>
  );
}

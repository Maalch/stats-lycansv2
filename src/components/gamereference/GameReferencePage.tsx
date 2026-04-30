import { useState, useMemo, useCallback } from 'react';
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
} from '../../hooks/useGameReference';
import { CampHubTile } from './CampHubTile';
import { CampDrillDown } from './CampDrillDown';
import { RoleBreadcrumb } from './RoleBreadcrumb';
import './GameReferencePage.css';

// ============================================
// View mode
// ============================================
type ViewMode = 'hierarchical' | 'flat';

// ============================================
// Category definitions for flat view sub-navigation
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
] as const;

// ============================================
// Non-camp categories for hierarchical overview
// ============================================
const ITEM_CATEGORIES = [
  { key: 'secondaryRoles', label: 'Rôles Secondaires', icon: '🔄' },
  { key: 'deadRoles', label: 'Rôles de Mort', icon: '👻' },
  { key: 'accessories', label: 'Accessoires', icon: '💍' },
  { key: 'gadgets', label: 'Gadgets & Objets', icon: '🧪' },
  { key: 'effects', label: 'Effets & Potions', icon: '✨' },
  { key: 'events', label: 'Événements', icon: '⚡' },
] as const;

type ItemCategoryKey = typeof ITEM_CATEGORIES[number]['key'];

type CategoryKey = typeof CATEGORIES[number]['key'];

type CategoryCounts = Record<CategoryKey, number>;

type FilteredReferenceData = {
  camps: CampEntry[];
  mainRoles: MainRoleEntry[];
  wolfPowers: PowerEntry[];
  villagerPowers: PowerEntry[];
  elitePowers: PowerEntry[];
  secondaryRoles: SecondaryRoleEntry[];
  deadRoles: DeadRoleEntry[];
  accessories: AccessoryEntry[];
  gadgets: GadgetEntry[];
  potionEffects: PotionEffectEntry[];
  statusEffects: StatusEffectEntry[];
  events: EventEntry[];
  counts: CategoryCounts;
  totalMatches: number;
};

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
    <div
      className={`ref-effect-tag ${typeClass}`}
      title={effect.tutorial || undefined}
      aria-label={effect.tutorial ? `${effect.name}: ${effect.tutorial}` : effect.name}
    >
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

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="ref-section__title">
      <span>{title}</span>
      <span className="ref-section__count">{count}</span>
    </h2>
  );
}

// ============================================
// Search helper
// ============================================
function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractSearchTerms(searchTerm: string): string[] {
  const normalized = normalizeSearchValue(searchTerm);
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}

function matchesSearch(searchTerms: string[], ...fields: (string | undefined | null)[]): boolean {
  if (searchTerms.length === 0) return true;

  const searchableText = normalizeSearchValue(
    fields
      .filter((field): field is string => Boolean(field))
      .join(' ')
  );

  return searchTerms.every(term => searchableText.includes(term));
}

// ============================================
// Main page component
// ============================================
export function GameReferencePage() {
  const { data, isLoading, error } = useGameReference();
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');
  const [selectedCamp, setSelectedCamp] = useState<string | null>(null);
  const [selectedItemCategory, setSelectedItemCategory] = useState<ItemCategoryKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('camps');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTerms = useMemo(() => extractSearchTerms(searchTerm), [searchTerm]);

  const handleCampClick = useCallback((campId: string) => {
    setSelectedCamp(campId);
    setSelectedItemCategory(null);
  }, []);

  const handleBackToOverview = useCallback(() => {
    setSelectedCamp(null);
    setSelectedItemCategory(null);
  }, []);

  const handleItemCategoryClick = useCallback((key: ItemCategoryKey) => {
    setSelectedItemCategory(key);
    setSelectedCamp(null);
  }, []);

  const filteredData = useMemo<FilteredReferenceData | null>(() => {
    if (!data) return null;

    const camps = data.camps.filter(c =>
      matchesSearch(searchTerms, c.name, c.description, c.winCondition, c.roles.join(' '))
    );

    const mainRoles = data.mainRoles.filter(r =>
      matchesSearch(
        searchTerms,
        r.name,
        r.description,
        r.descriptionShort,
        r.camp,
        r.type,
        r.subRoles?.map(sub => sub.name).join(' ')
      )
    );

    const wolfPowers = data.wolfPowers.filter(p =>
      matchesSearch(searchTerms, p.name, p.description, p.descriptionShort)
    );

    const villagerPowers = data.villagerPowers.filter(p =>
      matchesSearch(searchTerms, p.name, p.description, p.descriptionShort)
    );

    const elitePowers = data.elitePowers.filter(p =>
      matchesSearch(searchTerms, p.name, p.description, p.descriptionShort)
    );

    const secondaryRoles = data.secondaryRoles.filter(r =>
      matchesSearch(searchTerms, r.name, r.description, r.descriptionShort, r.descriptionVillager, r.descriptionWolf)
    );

    const deadRoles = data.deadRoles.filter(r =>
      matchesSearch(searchTerms, r.name, r.description, r.camp)
    );

    const accessories = data.accessories.filter(a =>
      matchesSearch(searchTerms, a.name, a.description, a.tinkererEffect)
    );

    const gadgets = data.gadgets.filter(g =>
      matchesSearch(searchTerms, g.name, g.description, g.gasTypes?.map(gas => gas.name).join(' '))
    );

    const potionEffects = data.potionEffects.filter(e =>
      matchesSearch(searchTerms, e.name, e.type, e.tutorial)
    );

    const statusEffects = data.statusEffects.filter(e =>
      matchesSearch(searchTerms, e.name, e.tutorial)
    );

    const events = data.events.filter(e =>
      matchesSearch(searchTerms, e.name, e.description)
    );

    const counts: CategoryCounts = {
      camps: camps.length + mainRoles.length,
      wolfPowers: wolfPowers.length,
      villagerPowers: villagerPowers.length,
      elitePowers: elitePowers.length,
      secondaryRoles: secondaryRoles.length,
      deadRoles: deadRoles.length,
      accessories: accessories.length,
      gadgets: gadgets.length,
      effects: potionEffects.length + statusEffects.length,
      events: events.length,
    };

    const totalMatches = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return {
      camps,
      mainRoles,
      wolfPowers,
      villagerPowers,
      elitePowers,
      secondaryRoles,
      deadRoles,
      accessories,
      gadgets,
      potionEffects,
      statusEffects,
      events,
      counts,
      totalMatches,
    };
  }, [data, searchTerms]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!data) return <div>Aucune donnée disponible</div>;
  if (!filteredData) return <div>Aucune donnée disponible</div>;

  const hasActiveSearch = searchTerms.length > 0;

  const searchSummary = hasActiveSearch
    ? `${filteredData.totalMatches} résultat${filteredData.totalMatches > 1 ? 's' : ''} pour "${searchTerm.trim()}".`
    : `${filteredData.totalMatches} éléments de référence disponibles.`;

  // ============================================
  // Hierarchical view: render camp hub or drill-down
  // ============================================
  const renderHierarchicalContent = () => {
    const currentCampRaw = selectedCamp ? data.camps.find(c => c.id === selectedCamp) : null;

    // Camp drill-down view
    if (selectedCamp && currentCampRaw) {
      return (
        <div className="ref-drilldown-container">
          <RoleBreadcrumb
            campName={currentCampRaw.name}
            campEmoji={currentCampRaw.emoji}
            onBackToOverview={handleBackToOverview}
          />
          <CampDrillDown
            camp={currentCampRaw}
            mainRoles={filteredData.mainRoles}
            wolfPowers={filteredData.wolfPowers}
            villagerPowers={filteredData.villagerPowers}
            elitePowers={filteredData.elitePowers}
            secondaryRoles={filteredData.secondaryRoles}
            deadRoles={filteredData.deadRoles}
            searchTerms={searchTerms}
          />
        </div>
      );
    }

    // Item category view
    if (selectedItemCategory) {
      return (
        <div className="ref-drilldown-container">
          <RoleBreadcrumb
            campName={ITEM_CATEGORIES.find(c => c.key === selectedItemCategory)?.label}
            campEmoji={ITEM_CATEGORIES.find(c => c.key === selectedItemCategory)?.icon}
            onBackToOverview={handleBackToOverview}
          />
          {renderItemCategory(selectedItemCategory)}
        </div>
      );
    }

    // Overview: camp hub + item category buttons
    return (
      <div className="ref-overview">
        {/* Camp hub tiles */}
        <div className="ref-section">
          <h2 className="ref-section__title">
            <span>Explorer par Camp</span>
          </h2>
          <div className="ref-hub-grid">
            {filteredData.camps.map(camp => (
              <CampHubTile
                key={camp.id}
                camp={camp}
                roles={filteredData.mainRoles.filter(r => r.camp === camp.id)}
                onClick={() => handleCampClick(camp.id)}
              />
            ))}
          </div>
        </div>

        {/* Item categories */}
        <div className="ref-section">
          <h2 className="ref-section__title">
            <span>Mécaniques & Objets</span>
          </h2>
          <div className="ref-item-categories">
            {ITEM_CATEGORIES.map(cat => {
              const count = filteredData.counts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  className="ref-item-category-btn"
                  onClick={() => handleItemCategoryClick(cat.key)}
                  type="button"
                >
                  <span className="ref-item-category-btn__icon">{cat.icon}</span>
                  <span className="ref-item-category-btn__label">{cat.label}</span>
                  <span className="ref-item-category-btn__count">{count}</span>
                  <span className="ref-item-category-btn__arrow">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render a specific item category content (for hierarchical drill-down)
  const renderItemCategory = (categoryKey: ItemCategoryKey) => {
    switch (categoryKey) {
      case 'secondaryRoles':
        return (
          <div className="ref-section">
            <SectionTitle title="Rôles Secondaires 🔄" count={filteredData.secondaryRoles.length} />
            <p className="ref-section__subtitle">Assignés en plus du rôle principal. Peuvent avoir des effets différents selon que le joueur est Villageois ou Loup.</p>
            <div className="ref-grid">
              {filteredData.secondaryRoles.map(r => <SecondaryRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      case 'deadRoles':
        return (
          <div className="ref-section">
            <SectionTitle title="Rôles de Mort 👻" count={filteredData.deadRoles.length} />
            <p className="ref-section__subtitle">Rôles attribués aux joueurs après leur mort, leur permettant de continuer à influencer la partie.</p>
            <div className="ref-grid">
              {filteredData.deadRoles.map(r => <DeadRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      case 'accessories':
        return (
          <div className="ref-section">
            <SectionTitle title="Accessoires 💍" count={filteredData.accessories.length} />
            <p className="ref-section__subtitle">Équipements passifs trouvés dans le jeu. Le rôle secondaire Bricoleur peut les activer pour un effet spécial.</p>
            <div className="ref-grid">
              {filteredData.accessories.map(a => <AccessoryCard key={a.id} accessory={a} />)}
            </div>
          </div>
        );
      case 'gadgets':
        return (
          <div className="ref-section">
            <SectionTitle title="Gadgets & Objets 🧪" count={filteredData.gadgets.length} />
            <p className="ref-section__subtitle">Objets utilisables trouvés ou fabriqués pendant la partie.</p>
            <div className="ref-grid">
              {filteredData.gadgets.map(g => <GadgetCard key={g.id} gadget={g} />)}
            </div>
          </div>
        );
      case 'effects':
        return (
          <>
            {filteredData.potionEffects.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Effets de Potions 🧪" count={filteredData.potionEffects.length} />
                <p className="ref-section__subtitle">Effets applicables via les potions trouvées en jeu.</p>
                <div className="ref-effects-grid">
                  {filteredData.potionEffects.map(e => <EffectCard key={e.id} effect={e} type="potion" />)}
                </div>
              </div>
            )}
            {filteredData.statusEffects.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Effets de Statut ✨" count={filteredData.statusEffects.length} />
                <p className="ref-section__subtitle">Tous les effets de statut pouvant affecter les joueurs pendant la partie.</p>
                <div className="ref-effects-grid">
                  {filteredData.statusEffects.map(e => <EffectCard key={e.id} effect={e} type="status" />)}
                </div>
              </div>
            )}
          </>
        );
      case 'events':
        return (
          <div className="ref-section">
            <SectionTitle title="Événements ⚡" count={filteredData.events.length} />
            <p className="ref-section__subtitle">Événements aléatoires pouvant survenir pendant une journée, affectant tous les joueurs.</p>
            <div className="ref-grid">
              {filteredData.events.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ============================================
  // Flat view: original category-based navigation
  // ============================================
  const renderFlatContent = () => {
    const selectedCategoryCount = filteredData.counts[selectedCategory] || 0;
    const selectedCategoryMeta = CATEGORIES.find(cat => cat.key === selectedCategory);
    const firstCategoryWithResults = CATEGORIES.find(cat => (filteredData.counts[cat.key] || 0) > 0);

    return (
      <>
        {/* Category sub-navigation */}
        <nav className="lycans-categories-selection">
          {CATEGORIES.map(cat => {
            const count = filteredData.counts[cat.key] || 0;
            const hasResults = !hasActiveSearch || count > 0;
            return (
              <button
                key={cat.key}
                className={`lycans-categorie-btn${selectedCategory === cat.key ? ' active' : ''}${!hasResults ? ' ref-cat-empty' : ''}`}
                onClick={() => setSelectedCategory(cat.key)}
                type="button"
                aria-pressed={selectedCategory === cat.key}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {hasActiveSearch && (
                  <span className="ref-cat-count">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Category content */}
        <div className="ref-content">
          {selectedCategoryCount > 0 || !hasActiveSearch ? (
            renderCategoryContent()
          ) : (
            <div className="ref-empty-state">
              <h3 className="ref-empty-state__title">Aucun résultat dans cette catégorie</h3>
              <p className="ref-empty-state__text">
                La recherche &quot;{searchTerm.trim()}&quot; ne retourne aucun élément pour {selectedCategoryMeta?.label || 'la catégorie active'}.
              </p>
              <div className="ref-empty-state__actions">
                <button
                  type="button"
                  className="ref-empty-state__button"
                  onClick={() => setSearchTerm('')}
                >
                  Effacer la recherche
                </button>
                {firstCategoryWithResults && (
                  <button
                    type="button"
                    className="ref-empty-state__button ref-empty-state__button--ghost"
                    onClick={() => setSelectedCategory(firstCategoryWithResults.key)}
                  >
                    Ouvrir {firstCategoryWithResults.label} ({filteredData.counts[firstCategoryWithResults.key]})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'camps': {
        const filteredCamps = filteredData.camps;
        const filteredRoles = filteredData.mainRoles;
        return (
          <>
            {filteredCamps.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Camps" count={filteredCamps.length} />
                <div className="ref-grid ref-grid--camps">
                  {filteredCamps.map(camp => (
                    <CampCard key={camp.id} camp={camp} />
                  ))}
                </div>
              </div>
            )}
            {filteredRoles.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Rôles Principaux" count={filteredRoles.length} />
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
        const filtered = filteredData.wolfPowers;
        return (
          <div className="ref-section">
            <SectionTitle title="Pouvoirs de Loup 🐺" count={filtered.length} />
            <p className="ref-section__subtitle">Pouvoirs spéciaux assignés aux Loups en plus de leur rôle principal.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="wolf" />)}
            </div>
          </div>
        );
      }

      case 'villagerPowers': {
        const filtered = filteredData.villagerPowers;
        return (
          <div className="ref-section">
            <SectionTitle title="Métiers de Villageois 👤" count={filtered.length} />
            <p className="ref-section__subtitle">Pouvoirs spéciaux (métiers) assignés aux Villageois de base.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="villager" />)}
            </div>
          </div>
        );
      }

      case 'elitePowers': {
        const filtered = filteredData.elitePowers;
        return (
          <div className="ref-section">
            <SectionTitle title="Pouvoirs d'Élite ⭐" count={filtered.length} />
            <p className="ref-section__subtitle">Pouvoirs spéciaux réservés aux Villageois Élite. Doivent utiliser une balle pour charger leur pouvoir.</p>
            <div className="ref-grid">
              {filtered.map(p => <PowerCard key={p.id} power={p} variant="elite" />)}
            </div>
          </div>
        );
      }

      case 'secondaryRoles': {
        const filtered = filteredData.secondaryRoles;
        return (
          <div className="ref-section">
            <SectionTitle title="Rôles Secondaires 🔄" count={filtered.length} />
            <p className="ref-section__subtitle">Assignés en plus du rôle principal. Peuvent avoir des effets différents selon que le joueur est Villageois ou Loup.</p>
            <div className="ref-grid">
              {filtered.map(r => <SecondaryRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      }

      case 'deadRoles': {
        const filtered = filteredData.deadRoles;
        return (
          <div className="ref-section">
            <SectionTitle title="Rôles de Mort 👻" count={filtered.length} />
            <p className="ref-section__subtitle">Rôles attribués aux joueurs après leur mort, leur permettant de continuer à influencer la partie.</p>
            <div className="ref-grid">
              {filtered.map(r => <DeadRoleCard key={r.id} role={r} />)}
            </div>
          </div>
        );
      }

      case 'accessories': {
        const filtered = filteredData.accessories;
        return (
          <div className="ref-section">
            <SectionTitle title="Accessoires 💍" count={filtered.length} />
            <p className="ref-section__subtitle">Équipements passifs trouvés dans le jeu. Le rôle secondaire Bricoleur peut les activer pour un effet spécial.</p>
            <div className="ref-grid">
              {filtered.map(a => <AccessoryCard key={a.id} accessory={a} />)}
            </div>
          </div>
        );
      }

      case 'gadgets': {
        const filtered = filteredData.gadgets;
        return (
          <div className="ref-section">
            <SectionTitle title="Gadgets & Objets 🧪" count={filtered.length} />
            <p className="ref-section__subtitle">Objets utilisables trouvés ou fabriqués pendant la partie.</p>
            <div className="ref-grid">
              {filtered.map(g => <GadgetCard key={g.id} gadget={g} />)}
            </div>
          </div>
        );
      }

      case 'effects': {
        const filteredPotions = filteredData.potionEffects;
        const filteredStatus = filteredData.statusEffects;
        return (
          <>
            {filteredPotions.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Effets de Potions 🧪" count={filteredPotions.length} />
                <p className="ref-section__subtitle">Effets applicables via les potions trouvées en jeu.</p>
                <div className="ref-effects-grid">
                  {filteredPotions.map(e => <EffectCard key={e.id} effect={e} type="potion" />)}
                </div>
              </div>
            )}
            {filteredStatus.length > 0 && (
              <div className="ref-section">
                <SectionTitle title="Effets de Statut ✨" count={filteredStatus.length} />
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
        const filtered = filteredData.events;
        return (
          <div className="ref-section">
            <SectionTitle title="Événements ⚡" count={filtered.length} />
            <p className="ref-section__subtitle">Événements aléatoires pouvant survenir pendant une journée, affectant tous les joueurs.</p>
            <div className="ref-grid">
              {filtered.map(e => <EventCard key={e.id} event={e} />)}
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
      <div className="ref-toolbar">
        <div className="ref-toolbar__row">
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

          {/* View mode toggle */}
          <div className="ref-view-toggle">
            <button
              className={`ref-view-toggle__btn${viewMode === 'hierarchical' ? ' active' : ''}`}
              onClick={() => { setViewMode('hierarchical'); handleBackToOverview(); }}
              type="button"
              title="Vue hiérarchique"
            >
              🏗️
            </button>
            <button
              className={`ref-view-toggle__btn${viewMode === 'flat' ? ' active' : ''}`}
              onClick={() => setViewMode('flat')}
              type="button"
              title="Vue liste"
            >
              📋
            </button>
          </div>
        </div>

        <div className="ref-search-meta">
          <p className="ref-search-meta__summary">{searchSummary}</p>
          {hasActiveSearch && (
            <div className="ref-search-meta__chips">
              <span className="ref-search-chip ref-search-chip--accent">Recherche active</span>
            </div>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="ref-content">
        {viewMode === 'hierarchical' ? renderHierarchicalContent() : renderFlatContent()}
      </div>
    </div>
  );
}

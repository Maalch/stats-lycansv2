import { useState } from 'react';
import './PlayerTitlesDisplay.css';
import type { PlayerTitleData, PlayerTitle, NearMissTitle, NearMissCondition } from '../../hooks/usePlayerTitles';

interface PlayerTitlesDisplayProps {
  playerTitles: PlayerTitleData | null;
  titlesLoading: boolean;
}

/** Map a stat key to its French display name */
function getStatLabel(stat: string): string {
  const labels: Record<string, string> = {
    winRate: 'Victoires', loot: 'Récolte', lootVillageois: 'Récolte (Villageois)',
    lootLoup: 'Récolte (Loup)', survival: 'Survie', killRate: 'Kills',
    talking: 'Parole', talkingOutsideMeeting: 'Parole (hors débats)',
    talkingDuringMeeting: 'Parole (meeting)', votingAggressive: 'Vote agressif',
    votingAccuracy: 'Précision vote', votingFirst: 'Vote rapide',
    survivalDay1: 'Survie J1', winRateVillageois: 'Victoires Villageois',
    winRateLoup: 'Victoires Loup', winRateSolo: 'Victoires Solo',
    hunterAccuracy: 'Précision cible chasseur', hunterShotAccuracy: 'Précision tir chasseur',
    zoneVillagePrincipal: 'Village Principal', zoneFerme: 'Ferme',
    zoneVillagePecheur: 'Village Pêcheur', zoneRuines: 'Ruines',
    zoneResteCarte: 'Reste de la carte', zoneDominantPercentage: 'Dominance zone',
  };
  return labels[stat] || stat;
}

export function PlayerTitlesDisplay({ playerTitles, titlesLoading }: PlayerTitlesDisplayProps) {
  // Accordion state: which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    owned: true,
    reconquer: false,
    nearMiss: false,
  });

  // Which title card has its conditions expanded (only one at a time)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCardConditions = (titleId: string) => {
    setExpandedCardId(prev => prev === titleId ? null : titleId);
  };

  if (titlesLoading) {
    return (
      <div className="titles-section">
        <div className="titles-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des titres...</p>
        </div>
      </div>
    );
  }

  if (!playerTitles || playerTitles.titles.length === 0) {
    return (
      <div className="titles-section">
        <div className="titles-empty">
          <p>📜 Aucun titre disponible</p>
          <p className="empty-subtitle">
            {playerTitles?.gamesPlayed ? 
              `${playerTitles.gamesPlayed} parties jouées - minimum 25 parties requises pour obtenir des titres` :
              'Les titres sont générés chaque dimanche pour les joueurs avec 25+ parties en mode moddé'
            }
          </p>
        </div>
      </div>
    );
  }

  // Sort titles by claim strength (same algorithm as server-side)
  const sortedTitles = [...playerTitles.titles].sort((a, b) => {
    const indexA = playerTitles.titles.indexOf(a);
    const isBadA = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(a.category || '');
    const adjustedPercentileA = isBadA ? (100 - (a.percentile || 50)) : (a.percentile || 50);
    const claimStrengthA = ((a.priority || 0) * 1000) + (adjustedPercentileA * 10) - indexA;
    
    const indexB = playerTitles.titles.indexOf(b);
    const isBadB = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(b.category || '');
    const adjustedPercentileB = isBadB ? (100 - (b.percentile || 50)) : (b.percentile || 50);
    const claimStrengthB = ((b.priority || 0) * 1000) + (adjustedPercentileB * 10) - indexB;
    
    return claimStrengthB - claimStrengthA;
  });

  // Separate titles into owned vs. awarded to others
  const ownedTitles = sortedTitles.filter(title => !title.primaryOwner);
  const awardedElsewhere = sortedTitles.filter(title => title.primaryOwner);
  const nearMissTitles = playerTitles.nearMissTitles || [];

  // ---- Title card renderer ----
  const renderTitleCard = (title: PlayerTitle, index: number) => {
    const isPrimary = playerTitles.primaryTitle?.id === title.id;
    const hasConditions = title.type === 'combination' && title.conditions && title.conditions.length > 0;
    const isConditionsExpanded = expandedCardId === title.id;

    return (
      <div 
        key={title.id} 
        className={`title-card ${title.type} ${isPrimary ? 'primary' : ''} ${title.primaryOwner ? 'awarded-elsewhere' : ''}`}
      >
        <div className="title-rank">{index + 1}</div>
        {isPrimary && <div className="title-crown">👑</div>}
        <div className="title-emoji">{title.emoji}</div>
        <div className="title-info">
          <div className="title-name">{title.title}</div>
          <div className="title-description">{title.description}</div>
          {/* Percentile badge for non-combination titles */}
          {title.percentile !== undefined && title.type !== 'combination' && (
            <div className="title-percentile">
              Top {(100 - title.percentile).toFixed(0)}%
            </div>
          )}
          <div className="title-type-badge">
            {title.type === 'combination' ? 'Combo' : 
             title.type === 'role' ? 'Rôle' : 'Stat'}
          </div>
          {/* Primary owner indicator */}
          {!isPrimary && title.primaryOwner && (
            <div className="title-primary-owner">
              ⚔️ Détenu par <strong>{title.primaryOwner}</strong>
            </div>
          )}
          {/* Click-to-expand conditions toggle for combination titles */}
          {hasConditions && (
            <>
              <button
                type="button"
                className={`title-conditions-toggle ${isConditionsExpanded ? 'expanded' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleCardConditions(title.id); }}
              >
                <span className="toggle-arrow">▶</span>
                📊 Conditions ({title.conditions!.length})
              </button>
              {isConditionsExpanded && (
                <div className="title-conditions-breakdown">
                  {title.conditions!.map((condition, condIndex: number) => (
                    <div key={condIndex} className="condition-item">
                      <span className="condition-stat">
                        {getStatLabel(condition.stat)}:
                      </span>
                      <span className={`condition-category ${condition.category?.toLowerCase()}`}>
                        {condition.category}
                      </span>
                      {condition.actualPercentile !== undefined && (
                        <span className="condition-percentile">
                          (Top {(100 - condition.actualPercentile).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ---- Near-miss card renderer ----
  const renderNearMissCard = (title: NearMissTitle, index: number) => {
    const progress = title.conditionsMet / title.conditionsTotal;

    return (
      <div key={title.id} className="title-card near-miss">
        <div className="title-rank">{index + 1}</div>
        <div className="title-emoji">{title.emoji}</div>
        <div className="title-info">
          <div className="title-name">{title.title}</div>
          <div className="title-description">{title.description}</div>
          {/* Progress bar */}
          <div className="near-miss-progress-container">
            <div className="near-miss-progress-bar">
              <div
                className="near-miss-progress-fill"
                style={{ width: `${Math.max(progress * 100, 5)}%` }}
              />
            </div>
            <span className="near-miss-progress-text">
              {title.conditionsMet}/{title.conditionsTotal} conditions
            </span>
          </div>
          {/* Conditions with met/unmet indicators */}
          <div className="near-miss-conditions">
            {title.conditions.map((condition: NearMissCondition, condIndex: number) => (
              <div key={condIndex} className={`condition-item ${condition.met ? 'met' : 'unmet'}`}>
                <span className="condition-status">{condition.met ? '✅' : '❌'}</span>
                <span className="condition-stat">
                  {getStatLabel(condition.stat)}:
                </span>
                <span className={`condition-category ${condition.category?.toLowerCase()}`}>
                  {condition.category}
                </span>
                {!condition.met && condition.gap !== undefined && (
                  <span className="condition-gap">
                    Encore {Math.abs(condition.gap).toFixed(0)} pts
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- Accordion section renderer ----
  const renderAccordionSection = (
    key: string,
    icon: string,
    label: string,
    count: number,
    subtitle: string,
    variant: string,
    children: React.ReactNode
  ) => (
    <div className={`titles-accordion ${variant}`}>
      <div
        className="titles-accordion-header"
        onClick={() => toggleSection(key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSection(key); }}
      >
        <span className={`titles-accordion-arrow ${expandedSections[key] ? 'expanded' : ''}`}>▶</span>
        <h4>{icon} {label} ({count})</h4>
        <p className="titles-accordion-subtitle">{subtitle}</p>
      </div>
      {expandedSections[key] && (
        <div className="titles-accordion-content">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="titles-section">
      {/* Header */}
      <div className="titles-header">
        <h3>🏷️ Titres actuels</h3>
        <p className="titles-info">
          {playerTitles.titles.length} titre{playerTitles.titles.length > 1 ? 's' : ''} • {playerTitles.gamesPlayed} parties jouées
        </p>
      </div>

      {/* Summary Bar */}
      <div className="titles-summary">
        {playerTitles.primaryTitle && (
          <div className="titles-summary-item primary-summary">
            <span className="titles-summary-emoji">👑</span>
            <span className="titles-summary-label">{playerTitles.primaryTitle.emoji} {playerTitles.primaryTitle.title}</span>
          </div>
        )}
        <div className="titles-summary-item" onClick={() => { setExpandedSections(prev => ({ ...prev, owned: true })); }}>
          <span className="titles-summary-value">{ownedTitles.length}</span>
          <span className="titles-summary-label">✨ Détenus</span>
        </div>
        {awardedElsewhere.length > 0 && (
          <div className="titles-summary-item" onClick={() => { setExpandedSections(prev => ({ ...prev, reconquer: true })); }}>
            <span className="titles-summary-value">{awardedElsewhere.length}</span>
            <span className="titles-summary-label">🏆 À reconquérir</span>
          </div>
        )}
        {nearMissTitles.length > 0 && (
          <div className="titles-summary-item" onClick={() => { setExpandedSections(prev => ({ ...prev, nearMiss: true })); }}>
            <span className="titles-summary-value">{nearMissTitles.length}</span>
            <span className="titles-summary-label">🎯 À portée</span>
          </div>
        )}
      </div>

      {/* Section 1: Owned Titles */}
      {ownedTitles.length > 0 && renderAccordionSection(
        'owned', '✨', 'Vos Titres', ownedTitles.length,
        'Titres que vous possédez ou partagez',
        'owned',
        <div className="titles-grid">
          {ownedTitles.map((title, index) => renderTitleCard(title, index))}
        </div>
      )}

      {/* Section 2: Titles to Reconquer */}
      {awardedElsewhere.length > 0 && renderAccordionSection(
        'reconquer', '🏆', 'Titres à reconquérir', awardedElsewhere.length,
        'Ces titres auraient pu être les vôtres — battez-vous pour les récupérer !',
        'reconquer',
        <div className="titles-grid">
          {awardedElsewhere.map((title, index) => renderTitleCard(title, ownedTitles.length + index))}
        </div>
      )}

      {/* Section 3: Near-Miss Titles */}
      {nearMissTitles.length > 0 && renderAccordionSection(
        'nearMiss', '🎯', 'Titres à portée', nearMissTitles.length,
        'Vous êtes proche de remplir les conditions pour ces titres',
        'near-miss',
        <div className="titles-grid">
          {nearMissTitles.map((title, index) => renderNearMissCard(title, index))}
        </div>
      )}
    </div>
  );
}

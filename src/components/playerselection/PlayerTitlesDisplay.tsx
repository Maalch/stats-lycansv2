import './PlayerTitlesDisplay.css';
import type { PlayerTitleData } from '../../hooks/usePlayerTitles';

interface PlayerTitlesDisplayProps {
  playerTitles: PlayerTitleData | null;
  titlesLoading: boolean;
}

export function PlayerTitlesDisplay({ playerTitles, titlesLoading }: PlayerTitlesDisplayProps) {
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

  // Sort titles by claim strength (same algorithm as server-side) to show why primary title was chosen
  const sortedTitles = [...playerTitles.titles].sort((a, b) => {
    // Calculate claim strength for title A
    const indexA = playerTitles.titles.indexOf(a);
    const isBadA = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(a.category || '');
    const adjustedPercentileA = isBadA ? (100 - (a.percentile || 50)) : (a.percentile || 50);
    const claimStrengthA = ((a.priority || 0) * 1000) + (adjustedPercentileA * 10) - indexA;
    
    // Calculate claim strength for title B
    const indexB = playerTitles.titles.indexOf(b);
    const isBadB = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(b.category || '');
    const adjustedPercentileB = isBadB ? (100 - (b.percentile || 50)) : (b.percentile || 50);
    const claimStrengthB = ((b.priority || 0) * 1000) + (adjustedPercentileB * 10) - indexB;
    
    return claimStrengthB - claimStrengthA; // Highest claim strength first
  });

  // Separate titles into owned vs. awarded to others
  const ownedTitles = sortedTitles.filter(title => !title.primaryOwner);
  const awardedElsewhere = sortedTitles.filter(title => title.primaryOwner);

  const renderTitleCard = (title: PlayerTitleData['titles'][0], index: number) => {
    const isPrimary = playerTitles.primaryTitle?.id === title.id;
    return (
      <div 
        key={title.id} 
        className={`title-card ${title.type} ${isPrimary ? 'primary' : ''} ${title.primaryOwner ? 'awarded-elsewhere' : ''}`}
        title={`${title.description}${title.percentile !== undefined ? `\nMeilleur·e que ${title.percentile.toFixed(1)}% des joueurs` : ''}`}
      >
        <div className="title-rank">{index + 1}</div>
        {isPrimary && <div className="title-crown">👑</div>}
        <div className="title-emoji">{title.emoji}</div>
        <div className="title-info">
          <div className="title-name">{title.title}</div>
          <div className="title-description">{title.description}</div>
          {/* Only show global percentile for non-combination titles */}
          {title.percentile !== undefined && title.type !== 'combination' && (
            <div className="title-percentile">
              Top {(100 - title.percentile).toFixed(0)}%
            </div>
          )}
          <div className="title-type-badge">
            {title.type === 'combination' ? 'Combo' : 
             title.type === 'role' ? 'Rôle' : 'Stat'}
          </div>
          {/* Show primary owner if title belongs to someone else */}
          {!isPrimary && title.primaryOwner && (
            <div className="title-primary-owner">
              👤 Titre principal de: <strong>{title.primaryOwner}</strong>
            </div>
          )}
          {/* Breakdown for combination titles */}
          {title.type === 'combination' && title.conditions && title.conditions.length > 0 && (
            <div className="title-conditions-breakdown">
              <div className="breakdown-header">Conditions:</div>
              {title.conditions.map((condition, condIndex: number) => (
                <div key={condIndex} className="condition-item">
                  <span className="condition-stat">
                    {condition.stat === 'winRate' ? 'Victoires' :
                     condition.stat === 'loot' ? 'Récolte' :
                     condition.stat === 'lootVillageois' ? 'Récolte (Villageois)' :
                     condition.stat === 'lootLoup' ? 'Récolte (Loup)' :
                     condition.stat === 'survival' ? 'Survie' :
                     condition.stat === 'killRate' ? 'Kills' :
                     condition.stat === 'talking' ? 'Parole' :
                     condition.stat === 'talkingOutsideMeeting' ? 'Parole (hors débats)' :
                     condition.stat === 'talkingDuringMeeting' ? 'Parole (meeting)' :
                     condition.stat === 'votingAggressive' ? 'Vote agressif' :
                     condition.stat === 'votingAccuracy' ? 'Précision vote' :
                     condition.stat === 'votingFirst' ? 'Vote rapide' :
                     condition.stat === 'survivalDay1' ? 'Survie J1' :
                     condition.stat === 'winRateVillageois' ? 'Victoires Villageois' :
                     condition.stat === 'winRateLoup' ? 'Victoires Loup' :
                     condition.stat === 'winRateSolo' ? 'Victoires Solo' :
                     condition.stat === 'hunterAccuracy' ? 'Précision cible chasseur' :
                     condition.stat === 'hunterShotAccuracy' ? 'Précision tir chasseur' :  
                     condition.stat === 'zoneVillagePrincipal' ? 'Village Principal' :
                     condition.stat === 'zoneFerme' ? 'Ferme' :
                     condition.stat === 'zoneVillagePecheur' ? 'Village Pêcheur' :
                     condition.stat === 'zoneRuines' ? 'Ruines' :
                     condition.stat === 'zoneResteCarte' ? 'Reste de la carte' :
                     condition.stat === 'zoneDominantPercentage' ? 'Dominance zone' :
                     condition.stat}:
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
        </div>
      </div>
    );
  };

  return (
    <div className="titles-section">
      <div className="titles-header">
        <h3>🏷️ Titres actuels</h3>
        <p className="titles-info">
          {playerTitles.titles.length} titre{playerTitles.titles.length > 1 ? 's' : ''} • {playerTitles.gamesPlayed} parties jouées
        </p>
      </div>

      {/* Player's Own Titles */}
      {ownedTitles.length > 0 && (
        <>
          <div className="titles-subsection-header">
            <h4>✨ Vos Titres ({ownedTitles.length})</h4>
            <p>Titres que vous possédez ou partagez</p>
          </div>
          <div className="titles-grid">
            {ownedTitles.map((title, index) => renderTitleCard(title, index))}
          </div>
        </>
      )}

      {/* Titles Awarded to Others */}
      {awardedElsewhere.length > 0 && (
        <>
          <div className="titles-subsection-header secondary">
            <h4>🏖️ Titres Qualifiés ({awardedElsewhere.length})</h4>
            <p>Vous remplissez les conditions, mais un autre joueur a une meilleure revendication</p>
          </div>
          <div className="titles-grid awarded-elsewhere-grid">
            {awardedElsewhere.map((title, index) => renderTitleCard(title, ownedTitles.length + index))}
          </div>
        </>
      )}
    </div>
  );
}


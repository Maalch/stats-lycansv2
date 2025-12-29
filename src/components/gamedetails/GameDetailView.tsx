import { useState, useMemo, useEffect } from 'react';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedFrenchColorMapping, mainCampOrder } from '../../types/api';
import { formatDeathTiming } from '../../utils/gameUtils';
import './GameDetailsChart.css';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { useSettings } from '../../context/SettingsContext';
import { getDeathTypeLabel } from '../../types/deathTypes';
import type { Clip } from '../../hooks/useCombinedRawData';
import { ClipViewer } from '../common/ClipViewer';
import { getClipDisplayName, findRelatedClips, findNextClip } from '../../utils/clipUtils';
import { useAllClips } from '../../hooks/useClips';
import { isVillageoisElite, getEffectivePower } from '../../utils/roleUtils';

// Interactive Camp Visualization Component
interface CampVisualizationProps {
  playerData: any[];
}

const CampVisualization = ({ playerData }: CampVisualizationProps) => {
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const frenchColorMapping = useThemeAdjustedFrenchColorMapping();
  
  // Group players by their camps
  const campGroups = playerData.reduce((groups, player) => {
    const camp = getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []));
    if (!groups[camp]) {
      groups[camp] = [];
    }
    groups[camp].push(player);
    return groups;
  }, {} as Record<string, any[]>);

  // Sort camps by size (largest first) and put main camps first
  const sortedCamps = Object.entries(campGroups).sort(([campA, playersA], [campB, playersB]) => {
    const aIsMain = mainCampOrder.includes(campA);
    const bIsMain = mainCampOrder.includes(campB);
    
    if (aIsMain && !bIsMain) return -1;
    if (!aIsMain && bIsMain) return 1;
    
    return (playersB as any[]).length - (playersA as any[]).length;
  });

  return (
    <div className="lycans-game-detail-section full-width">
      <h4>Composition des Camps</h4>
      <div className="camps-grid">
        {sortedCamps.map(([camp, players]) => {
          const typedPlayers = players as any[];
          const campColor = lycansColorScheme[camp as keyof typeof lycansColorScheme] || '#666';
          const winners = typedPlayers.filter((p: any) => p.Victorious);
          const isWinningCamp = winners.length > 0;
          
          return (
            <div 
              key={camp} 
              className={`camp-group ${isWinningCamp ? 'winning-camp' : ''}`}
              style={{ 
                borderColor: campColor,
                backgroundColor: `${campColor}15`,
                boxShadow: isWinningCamp ? `0 0 10px ${campColor}40` : 'none'
              }}
            >
              <div className="camp-header" style={{ backgroundColor: `${campColor}25` }}>
                <h5 style={{ color: campColor }}>
                  {camp} ({typedPlayers.length})
                  {isWinningCamp && <span className="victory-crown">👑</span>}
                </h5>
              </div>
              <div className="camp-players">
                {typedPlayers
                  .sort((a: any, b: any) => a.Username.localeCompare(b.Username))
                  .map((player: any) => {
                  // Get player's individual color if available
                  let playerColor = campColor;
                  if (player.Color && frenchColorMapping[player.Color]) {
                    playerColor = frenchColorMapping[player.Color];
                  }
                  
                  // Build death information for tooltip
                  let deathInfo = '';
                  if (player.DeathTiming) {
                    deathInfo = ` (Mort ${formatDeathTiming(player.DeathTiming)}`;
                    if (player.DeathType) {
                      deathInfo += ` - ${getDeathTypeLabel(player.DeathType)}`;
                    }
                    if (player.KillerName) {
                      deathInfo += ` - Tueur ${player.KillerName}`;
                    }
                    deathInfo += ')';
                  }
                  
                  return (
                    <div 
                      key={player.Username} 
                      className={`player-badge ${player.Victorious ? 'winner' : ''} ${player.DeathTiming ? 'dead' : 'alive'}`}
                      style={{ 
                        borderColor: playerColor
                      }}
                        title={`${player.Username} - ${getPlayerCampFromRole(player.MainRoleInitial) !== getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []))
                          ? `${getPlayerCampFromRole(player.MainRoleInitial)} puis ${getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []))}`
                          : getPlayerCampFromRole(player.MainRoleInitial)}${deathInfo}`}
                    >
                      <span className="gamedetails-player-name">{player.Username}</span>
                      {player.DeathTiming && <span className="death-indicator">💀</span>}
                      {player.Victorious && <span className="victory-indicator">⭐</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to format duration from seconds to minutes and seconds
function formatDuration(durationInSeconds: number | null): string {
  if (durationInSeconds === null || durationInSeconds <= 0) {
    return 'N/A';
  }

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

// Component to display detailed view of a single game
export function GameDetailView({ game }: { game: any }) {
  const [showVideo, setShowVideo] = useState(false);
  const [selectedVOD, setSelectedVOD] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  
  // Get all clips for related clips navigation
  const { clips: allClips } = useAllClips();
  
  // Get highlighted player from settings
  const { settings } = useSettings();

  // Extract available VODs from the game data
  // game.playerVODs contains per-player VOD URLs mapped by player Steam ID
  const availableVODs = useMemo(() => {
    const vods: { label: string; url: string; playerId: string; borderColor: string; textColor: string }[] = [];
    
    // Add player-specific VODs if available
    if (game.playerVODs && typeof game.playerVODs === 'object') {
      Object.entries(game.playerVODs).forEach(([playerId, vodUrl]) => {
        if (typeof vodUrl === 'string' && vodUrl.trim()) {
          // Find the player name from playerData using Steam ID
          const player = game.playerData?.find((p: any) => p.ID === playerId);
          const playerName = player?.Username || playerId;
          
          // Get the player's camp colors (same logic as "Rôles des Joueurs")
          let campBorderColor = '#666';
          let campTextColor = '#666';
          if (player) {
            const finalcamp = getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []));
            const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
            
            campBorderColor = lycansColorScheme[finalcamp as keyof typeof lycansColorScheme] || '#666';
            campTextColor = lycansColorScheme[finalRole as keyof typeof lycansColorScheme] || '#666';
            if (campTextColor === '#666') {
              campTextColor = lycansColorScheme[finalcamp as keyof typeof lycansColorScheme] || '#666';
            }
          }
          
          vods.push({
            label: `${playerName}`,
            url: vodUrl,
            playerId,
            borderColor: campBorderColor,
            textColor: campTextColor
          });
        }
      });
    }
    
    return vods;
  }, [game.playerVODs, game.playerData, lycansColorScheme]);

  // Set default selected VOD when video is shown
  useEffect(() => {
    if (showVideo && availableVODs.length > 0 && !selectedVOD) {
      // Only set a default VOD if there's exactly one VOD, 
      // OR if there's a highlighted player with a VOD
      if (availableVODs.length === 1) {
        // Single VOD: select it by default
        setSelectedVOD(availableVODs[0].url);
      } else if (settings.highlightedPlayer) {
        // Multiple VODs: check if highlighted player has a VOD
        const highlightedPlayerVOD = availableVODs.find(
          vod => vod.label.toLowerCase() === settings.highlightedPlayer?.toLowerCase()
        );
        if (highlightedPlayerVOD) {
          setSelectedVOD(highlightedPlayerVOD.url);
        }
        // If highlighted player doesn't have a VOD, don't select any by default
      }
      // If multiple VODs and no highlighted player, don't select any by default
    }
  }, [showVideo, availableVODs, selectedVOD, settings.highlightedPlayer]);

  // Determine if we should show video section
  const hasAnyVOD = availableVODs.length > 0;
  const showMultipleVODSelector = availableVODs.length > 1;

  return (
    <div className="lycans-game-detail-view">
      <div className="lycans-game-detail-grid">
        {/* Basic Game Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Générales</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Nombre de joueurs:</span>
              <span className="value">{game.playerCount}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Nombre de loups:</span>
              <span className="value">{game.wolfCount}</span>
            </div>
            {(game.hasTraitor || game.hasWolfCub) && (
              <div className="lycans-stat-item">
                <span className="label">Rôles spéciaux loup:</span>
                <span className="value">
                  {[
                    game.hasTraitor && `Traître (${game.traitorsCount})`,
                    game.hasWolfCub && `Louveteau (${game.wolfCubsCount})`
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {game.soloRoles && (
              <div className="lycans-stat-item">
                <span className="label">Rôles solo:</span>
                <span className="value">{game.soloRoles}</span>
              </div>
            )}
          </div>
        </div>

          {/* Additional Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Supplémentaires</h4>
          <div className="lycans-game-detail-stats">
            {game.victoryType !== null && (
              <div className="lycans-stat-item">
                <span className="label">Type de victoire:</span>
                <span className="value">{game.victoryType}</span>
              </div>
            )}
            <div className="lycans-stat-item">
              <span className="label">Jours de jeu:</span>
              <span className="value">{game.dayCount}</span>
            </div>
            {game.gameDuration !== null && (
              <div className="lycans-stat-item">
                <span className="label">Durée de la partie:</span>
                <span className="value">{formatDuration(game.gameDuration)}</span>
              </div>
            )}
            {game.versions && (
              <div className="lycans-stat-item">
                <span className="label">Version:</span>
                <span className="value">
                  {game.versions}
                  {game.isModded ? ' (moddée)' : ''}
                </span>
              </div>
            )}
            {game.map && (
              <div className="lycans-stat-item">
                <span className="label">Map:</span>
                <span className="value">{game.map}</span>
              </div>
            )}
          </div>
        </div>

        {/* Harvest (if applicable) */}
        {game.harvest !== null && (
          <div className="lycans-game-detail-section">
            <h4>Récolte</h4>
            <div className="lycans-game-detail-stats">
              <div className="lycans-stat-item">
                <span className="label">Récolte:</span>
                <span className="value">{game.harvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Total possible:</span>
                <span className="value">{game.totalHarvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Pourcentage:</span>
                <span className="value">
                  {typeof game.harvestPercentage === 'number'
                    ? (game.harvestPercentage * 100).toFixed(1) + '%'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Camp Visualization */}
        <CampVisualization playerData={game.playerData} />

        {/* Player Roles */}
        <div className="lycans-game-detail-section full-width">
          <h4>Rôles des Joueurs</h4>
          <div className="lycans-player-roles-grid">
            {game.playerData
              .sort((a: any, b: any) => {
                // Get camps for both players
                const campA = getPlayerCampFromRole(getPlayerFinalRole(a.MainRoleInitial, a.MainRoleChanges || []));
                const campB = getPlayerCampFromRole(getPlayerFinalRole(b.MainRoleInitial, b.MainRoleChanges || []));

                // Use main camp priority order from datasyncExport
                const priorityA = mainCampOrder.indexOf(campA);
                const priorityB = mainCampOrder.indexOf(campB);
                
                // If both camps are in priority list, sort by priority
                if (priorityA !== -1 && priorityB !== -1) {
                  return priorityA - priorityB;
                }
                
                // If only one camp is in priority list, prioritize it
                if (priorityA !== -1) return -1;
                if (priorityB !== -1) return 1;
                
                // If neither camp is in priority list, sort camps alphabetically
                if (campA !== campB) {
                  return campA.localeCompare(campB);
                }
                
                // If same camp, sort players alphabetically
                return a.Username.localeCompare(b.Username);
              })
              .map((playerStat: any) => {
              // Get role and camp information from MainRoleInitial
              const camp = getPlayerCampFromRole(playerStat.MainRoleInitial);          
              const originalRole = playerStat.MainRoleInitial;
              const finalcamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
              const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
              const power = playerStat.Power;
              const secondaryRole = playerStat.SecondaryRole;
              
              // Check if this is a Villageois Élite (new or legacy format)
              const isElite = isVillageoisElite(playerStat);
              const effectivePower = isElite ? getEffectivePower(playerStat) : null;
              
              // Build the comprehensive display text
              let displayText: string;
              
              if (isElite) {
                // For Villageois Élite: show "Villageois Élite - [Power] + [SecondaryRole]"
                // instead of "Villageois - Villageois Élite - [Power] + [SecondaryRole]"
                displayText = 'Villageois Élite';
                
                // Add power if available (from effective power which handles both formats)
                if (effectivePower && effectivePower.trim()) {
                  displayText += ` - ${effectivePower}`;
                }
                
                // Add secondary role if available
                if (secondaryRole && secondaryRole.trim()) {
                  displayText += ` + ${secondaryRole}`;
                }
              } else {
                // Standard display logic for non-Villageois Élite
                displayText = camp; // Start with main camp
                              
                // Add original role if different from main role
                if (originalRole && originalRole !== camp) {
                  displayText += ` - ${originalRole}`;
                }
                
                // Add power if available
                if (power && power.trim()) {
                  displayText += ` - ${power}`;
                }
                
                // Add secondary role if available
                if (secondaryRole && secondaryRole.trim()) {
                  displayText += ` + ${secondaryRole}`;
                }
              }

              if (finalRole && finalRole !== originalRole) {
                displayText += ` (devient ${finalRole})`;
              }

              // Get the camp border color
              let campTextColor = lycansColorScheme[getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []) as keyof typeof lycansColorScheme] || '#666';
              if (campTextColor === '#666') {
                 campTextColor = lycansColorScheme[finalcamp as keyof typeof lycansColorScheme] || '#666';
              }
              
              // For Villageois Élite, use the power color for the player name
              if (isElite && effectivePower) {
                const powerColor = lycansColorScheme[effectivePower as keyof typeof lycansColorScheme];
                if (powerColor) {
                  campTextColor = powerColor;
                }
              }
              
              const campBorderColor = lycansColorScheme[finalcamp as keyof typeof lycansColorScheme] || '#666';
              
              // Check if player is dead
              const isDead = playerStat.DeathTiming;
              
              // Check if player is victorious
              const isVictorious = playerStat.Victorious;
              
              return (
                <div 
                  key={playerStat.Username} 
                  className={`lycans-player-role-item ${isVictorious ? 'victorious' : ''}`}
                  style={{
                    borderColor: campBorderColor,
                  }}
                >
                  <div
                    className="lycans-player-name"
                    style={{
                      color: campTextColor,
                      textAlign: 'left'
                    }}
                  >
                    {playerStat.Username}
                    {isDead && <span className="death-skull">💀</span>}
                  </div>
                  <div
                    className="lycans-player-camp"
                    style={{ textAlign: 'left' }}
                  >
                    {displayText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Video Toggle Button */}
        {hasAnyVOD && (
          <div className="lycans-game-detail-section full-width">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="lycans-video-toggle-btn"
            >
              {showVideo ? '📹 Masquer la vidéo' : '🎥 Voir la vidéo'}
            </button>
          </div>
        )}

        {/* YouTube Video with Player Selection */}
        {hasAnyVOD && showVideo && (
          <div className="lycans-game-detail-section full-width">
            <h4>Vidéo de la Partie</h4>
            
            {/* Player VOD Selection Buttons */}
            {showMultipleVODSelector && (
              <nav className="lycans-vod-menu">
                {availableVODs.map((vod, index) => (
                  <button
                    key={index}
                    className={`lycans-vod-btn${selectedVOD === vod.url ? ' active' : ''}`}
                    onClick={() => setSelectedVOD(vod.url)}
                    type="button"
                    title={vod.label}
                    style={{
                      borderColor: vod.borderColor,
                      color: selectedVOD === vod.url ? 'white' : vod.textColor
                    }}
                  >
                    {vod.label}
                  </button>
                ))}
              </nav>
            )}
            
            <div className="lycans-youtube-container">
              {selectedVOD ? (
                <iframe
                  src={selectedVOD}
                  title={`Partie Lycans #${game.gameId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="lycans-youtube-iframe"
                />
              ) : (
                <div className="lycans-vod-placeholder">
                  <p>Sélectionnez une VOD de joueur pour commencer</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clips Section */}
        {game.clips && game.clips.length > 0 && (
          <div className="lycans-game-detail-section full-width">
            <h4>🎬 Clips de la Partie ({game.clips.length})</h4>
            
            <div className="lycans-clips-grid">
              {game.clips.map((clip: Clip) => (
                <button
                  key={clip.ClipId}
                  className="lycans-clip-card"
                  onClick={() => setSelectedClip(clip)}
                >
                  <div className="lycans-clip-card-header">
                    <span className="lycans-clip-icon">🎬</span>
                    <span className="lycans-clip-name">{getClipDisplayName(clip)}</span>
                  </div>
                  <div className="lycans-clip-card-pov">
                    POV: {clip.POVPlayer}
                  </div>
                  {clip.AdditionalInfo && (
                    <div className="lycans-clip-card-info">
                      {clip.AdditionalInfo.length > 60 
                        ? `${clip.AdditionalInfo.substring(0, 60)}...` 
                        : clip.AdditionalInfo}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
      
      {/* Clip Viewer Modal */}
      {selectedClip && (
        <ClipViewer
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
          relatedClips={findRelatedClips(selectedClip, allClips)}
          nextClip={findNextClip(selectedClip, allClips)}
          onNextClip={() => {
            const next = findNextClip(selectedClip, allClips);
            if (next) setSelectedClip(next);
          }}
          onRelatedClip={(clipId) => {
            const related = allClips.find(c => c.ClipId === clipId);
            if (related) setSelectedClip(related);
          }}
        />
      )}
    </div>
  );
}
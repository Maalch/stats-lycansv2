import { useState } from 'react';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedFrenchColorMapping, mainCampOrder } from '../../types/api';
import { formatDeathTiming } from '../../utils/gameUtils';
import './GameDetailsChart.css';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';

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
                  
                  return (
                    <div 
                      key={player.Username} 
                      className={`player-badge ${player.Victorious ? 'winner' : ''} ${player.DeathTiming ? 'dead' : 'alive'}`}
                      style={{ 
                        borderColor: playerColor
                      }}
                        title={`${player.Username} - ${getPlayerCampFromRole(player.MainRoleInitial) !== getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []))
                          ? `${getPlayerCampFromRole(player.MainRoleInitial)} puis ${getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []))}`
                          : getPlayerCampFromRole(player.MainRoleInitial)}${player.DeathTiming ? ` (Mort ${formatDeathTiming(player.DeathTiming)})` : ''}`}
                    >
                      <span className="player-name">{player.Username}</span>
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
  
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

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
            <div className="lycans-stat-item">
              <span className="label">Traître:</span>
              <span className="value">{game.hasTraitor ? 'Oui' : 'Non'}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Louveteau:</span>
              <span className="value">{game.hasWolfCub ? 'Oui' : 'Non'}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Amoureux:</span>
              <span className="value">{game.hasLovers ? 'Oui' : 'Non'}</span>
            </div>
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
              
              // Build the comprehensive display text
              let displayText = camp; // Start with main camp
                            
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

              if (finalRole && finalRole !== originalRole) {
                displayText += ` (devient ${finalRole})`;
              }

              // Get the camp border color
              let campTextColor = lycansColorScheme[getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []) as keyof typeof lycansColorScheme] || '#666';
              if (campTextColor === '#666') {
                 campTextColor = lycansColorScheme[finalcamp as keyof typeof lycansColorScheme] || '#666';
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
        {game.youtubeEmbedUrl && (
          <div className="lycans-game-detail-section full-width">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="lycans-video-toggle-btn"
            >
              {showVideo ? '📹 Masquer la vidéo' : '🎥 Voir la vidéo'}
            </button>
          </div>
        )}

        {/* YouTube Video */}
        {game.youtubeEmbedUrl && showVideo && (
          <div className="lycans-game-detail-section full-width">
            <h4>Vidéo de la Partie</h4>
            <div className="lycans-youtube-container">
              <iframe
                src={game.youtubeEmbedUrl}
                title={`Partie Lycans #${game.gameId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="lycans-youtube-iframe"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
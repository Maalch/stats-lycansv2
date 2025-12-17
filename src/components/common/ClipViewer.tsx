import { useEffect } from 'react';
import type { Clip } from '../../hooks/useCombinedRawData';
import { getTwitchEmbedUrl, getClipDisplayName, parseOtherPlayers } from '../../utils/clipUtils';
import './ClipViewer.css';

interface ClipViewerProps {
  clip: Clip;
  onClose: () => void;
  onNextClip?: () => void;
  onRelatedClip?: (clipId: string) => void;
  relatedClips?: Clip[];
  nextClip?: Clip | null;
}

export function ClipViewer({ 
  clip, 
  onClose, 
  onNextClip, 
  onRelatedClip,
  relatedClips = [],
  nextClip = null
}: ClipViewerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const embedUrl = getTwitchEmbedUrl(clip.ClipUrl);
  const displayName = getClipDisplayName(clip);
  const otherPlayers = parseOtherPlayers(clip.OthersPlayers);
  const hasSoundWarning = Array.isArray(clip.Tags) && clip.Tags.some(tag => tag.toLowerCase().includes('warning sonore'));

  return (
    <div className="lycans-clip-viewer-overlay" onClick={onClose}>
      <div className="lycans-clip-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="lycans-clip-viewer-header">
          <div className="lycans-clip-viewer-title">
            <h2>{displayName}</h2>
            {Array.isArray(clip.Tags) && clip.Tags.length > 0 && (
              <div className="lycans-clip-tags">
                {clip.Tags.map((tag, idx) => (
                  <span key={idx} className="lycans-clip-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button className="lycans-clip-viewer-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        {/* Sound Warning Banner */}
        {hasSoundWarning && (
          <div className="lycans-clip-warning-banner">
            <span className="lycans-clip-warning-icon">⚠️ 🔊</span>
            <span className="lycans-clip-warning-text">Attention : Ce clip contient un son fort</span>
          </div>
        )}

        <div className="lycans-clip-viewer-content">
          {/* Video Player */}
          <div className="lycans-clip-player">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                frameBorder="0"
                allowFullScreen
                scrolling="no"
                title={displayName}
              />
            ) : (
              <div className="lycans-clip-no-video">
                <p>Vidéo non disponible</p>
                {clip.ClipUrl && (
                  <a href={clip.ClipUrl} target="_blank" rel="noopener noreferrer">
                    Voir sur Twitch
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="lycans-clip-metadata">
            <div className="lycans-clip-info-section">
              <h3>Joueurs</h3>
              <div className="lycans-clip-players">
                <div className="lycans-clip-pov-player">
                  <span className="lycans-clip-pov-badge">POV</span>
                  <span className="lycans-clip-player-name">{clip.POVPlayer}</span>
                </div>
                {otherPlayers.length > 0 && (
                  <div className="lycans-clip-other-players">
                    {otherPlayers.map((player, idx) => (
                      <span key={idx} className="lycans-clip-player-name">{player}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {clip.AdditionalInfo && (
              <div className="lycans-clip-info-section">
                <h3>Description</h3>
                <p className="lycans-clip-description">{clip.AdditionalInfo}</p>
              </div>
            )}

            {/* Navigation Section */}
            {(nextClip || relatedClips.length > 0) && (
              <div className="lycans-clip-info-section">
                <h3>Clips liés</h3>
                <div className="lycans-clip-navigation">
                  {nextClip && onNextClip && (
                    <button 
                      className="lycans-clip-nav-btn lycans-clip-next-btn"
                      onClick={onNextClip}
                    >
                      ▶ Suivant: {getClipDisplayName(nextClip)}
                    </button>
                  )}
                  {relatedClips.length > 0 && onRelatedClip && (
                    <div className="lycans-clip-related-clips">
                      <p className="lycans-clip-related-label">Autres POV:</p>
                      {relatedClips.map((relatedClip) => (
                        <button
                          key={relatedClip.ClipId}
                          className="lycans-clip-nav-btn lycans-clip-related-btn"
                          onClick={() => onRelatedClip(relatedClip.ClipId)}
                        >
                          {getClipDisplayName(relatedClip)} ({relatedClip.POVPlayer})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

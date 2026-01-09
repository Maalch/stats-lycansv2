import { useInfo } from '../../context/InfoContext';
import './InfoBubble.css';

interface InfoBubbleProps {
  infoId: string;
  title: string;
  children: React.ReactNode;
}

export function InfoBubble({ infoId, title, children }: InfoBubbleProps) {
  const { activeInfo, toggleInfo } = useInfo();
  const isActive = activeInfo === infoId;

  return (
    <div className="info-bubble-container">
      <button 
        className="info-bubble-trigger"
        onClick={() => toggleInfo(infoId)}
        aria-label="Afficher les informations"
        title="Informations sur ce graphique"
      >
        ℹ️
      </button>
      
      {isActive && (
        <div className="info-bubble-content">
          <div className="info-bubble-header">
            <h4>{title}</h4>
            <button 
              className="info-bubble-close"
              onClick={() => toggleInfo(infoId)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <div className="info-bubble-body">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

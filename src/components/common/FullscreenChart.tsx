import type { ReactNode } from 'react';
import { useFullscreen } from '../../context/FullscreenContext';

interface FullscreenChartProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function FullscreenChart({ children, title, className = '' }: FullscreenChartProps) {
  const { openFullscreen } = useFullscreen();

  const handleFullscreen = () => {
    const fullscreenContent = (
      <div className="lycans-fullscreen-chart">
        {title && <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>{title}</h2>}
        <div style={{ height: 'calc(100vh - 200px)' }}>
          {children}
        </div>
      </div>
    );
    openFullscreen(fullscreenContent);
  };

  return (
    <div className={`lycans-chart-container ${className}`}>
      <button 
        className="lycans-fullscreen-button"
        onClick={handleFullscreen}
        title="Afficher en plein écran"
      >
        ⛶
      </button>
      {children}
    </div>
  );
}
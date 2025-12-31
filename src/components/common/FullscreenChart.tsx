import type { ReactNode } from 'react';
import { useFullscreen } from '../../context/FullscreenContext';

interface FullscreenChartProps {
  children: ReactNode | ((isFullscreen: boolean) => ReactNode);
  title?: string | ((isFullscreen: boolean) => string);
  className?: string;
}

export function FullscreenChart({ children, title, className = '' }: FullscreenChartProps) {
  const { openFullscreen } = useFullscreen();

  const handleFullscreen = () => {
    const fullscreenTitle = typeof title === 'function' ? title(true) : title;
    const fullscreenContent = (
      <div className="lycans-fullscreen-chart">
        {fullscreenTitle && <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>{fullscreenTitle}</h2>}
        <div style={{ height: 'calc(100vh - 200px)' }}>
          {typeof children === 'function' ? children(true) : children}
        </div>
      </div>
    );
    openFullscreen(fullscreenContent);
  };

  return (
    <div className={`lycans-chart-container ${className}`}>
      <button 
        type="button"
        className="lycans-fullscreen-button"
        onClick={handleFullscreen}
        title="Afficher en plein écran"
      >
        ⛶
      </button>
      {typeof children === 'function' ? children(false) : children}
    </div>
  );
}
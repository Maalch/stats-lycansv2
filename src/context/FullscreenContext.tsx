import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FullscreenContextType {
  isFullscreen: boolean;
  fullscreenContent: ReactNode | null;
  openFullscreen: (content: ReactNode) => void;
  closeFullscreen: () => void;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenContent, setFullscreenContent] = useState<ReactNode | null>(null);

  const openFullscreen = (content: ReactNode) => {
    setFullscreenContent(content);
    setIsFullscreen(true);
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setFullscreenContent(null);
    // Restore body scrolling
    document.body.style.overflow = 'unset';
  };

  return (
    <FullscreenContext.Provider value={{
      isFullscreen,
      fullscreenContent,
      openFullscreen,
      closeFullscreen
    }}>
      {children}
      {isFullscreen && (
        <div className="lycans-fullscreen-overlay">
          <div className="lycans-fullscreen-header">
            <button 
              className="lycans-fullscreen-close"
              onClick={closeFullscreen}
              aria-label="Fermer le plein écran"
            >
              ✕
            </button>
          </div>
          <div className="lycans-fullscreen-content">
            {fullscreenContent}
          </div>
        </div>
      )}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  const context = useContext(FullscreenContext);
  if (context === undefined) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
}
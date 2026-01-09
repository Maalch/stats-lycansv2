import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface InfoContextType {
  activeInfo: string | null;
  showInfo: (infoId: string) => void;
  hideInfo: () => void;
  toggleInfo: (infoId: string) => void;
}

const InfoContext = createContext<InfoContextType | undefined>(undefined);

export function InfoProvider({ children }: { children: ReactNode }) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const showInfo = (infoId: string) => {
    setActiveInfo(infoId);
  };

  const hideInfo = () => {
    setActiveInfo(null);
  };

  const toggleInfo = (infoId: string) => {
    setActiveInfo(prev => prev === infoId ? null : infoId);
  };

  return (
    <InfoContext.Provider value={{ activeInfo, showInfo, hideInfo, toggleInfo }}>
      {children}
    </InfoContext.Provider>
  );
}

export function useInfo() {
  const context = useContext(InfoContext);
  if (!context) {
    throw new Error('useInfo must be used within an InfoProvider');
  }
  return context;
}

type VillageZone = 'Village Principal' | 'Ferme' | 'Village Pêcheur' | 'Ruines' | 'Reste de la Carte';

interface ZoneAnalysisData {
  totalPlayerDeaths: number;
  totalAllDeaths: number;
  zoneStats: {
    zone: VillageZone;
    playerCount: number;
    playerPercent: number;
    avgPercent: number;
    deviation: number;
  }[];
  dominantZone: VillageZone | null;
  maxDeviation: number;
}

interface DeathMapZoneAnalysisProps {
  zoneAnalysis: ZoneAnalysisData | null;
  selectedMap: string;
  viewMode: 'deaths' | 'kills';
  selectedPlayerName: string;
  hoveredZone: VillageZone | null;
  setHoveredZone: (zone: VillageZone | null) => void;
}

export function DeathMapZoneAnalysis({
  zoneAnalysis,
  selectedMap,
  viewMode,
  selectedPlayerName,
  hoveredZone,
  setHoveredZone
}: DeathMapZoneAnalysisProps) {
  if (!zoneAnalysis || selectedMap !== 'Village' || viewMode !== 'deaths') {
    return null;
  }

  return (
    <div style={{ 
      flex: '1 1 100%', 
      marginBottom: '0rem',
      padding: '1.5rem', 
      background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
      borderRadius: '12px', 
      border: '2px solid var(--accent-primary)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <h3 style={{ 
        marginTop: 0,
        marginBottom: '1rem', 
        color: 'var(--accent-primary)',
        fontSize: '1.3rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📊 Analyse par zone (Village)
      </h3>
      <p style={{ 
        fontSize: '0.95rem', 
        marginBottom: '1rem', 
        color: 'var(--text-secondary)',
        lineHeight: '1.5'
      }}>
        Distribution des morts (selon les types sélectionnés) comparée à la moyenne de tous les joueurs:
      </p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1rem' 
      }}>
        {zoneAnalysis.zoneStats.map(stat => {
          const isHighlight = stat.zone === zoneAnalysis.dominantZone && zoneAnalysis.maxDeviation > 10;
          return (
            <div 
              key={stat.zone}
              onMouseEnter={() => setHoveredZone(stat.zone)}
              onMouseLeave={() => setHoveredZone(null)}
              style={{ 
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: hoveredZone === stat.zone ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '0.5rem',
                fontSize: '0.95rem'
              }}>
                {stat.zone}
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                <div>{selectedPlayerName}: <strong>{stat.playerPercent.toFixed(1)}%</strong> ({stat.playerCount})</div>
                <div style={{ opacity: 0.85 }}>Moyenne: {stat.avgPercent.toFixed(1)}%</div>
                <div style={{ 
                  marginTop: '0.25rem',
                  color: isHighlight ? 'var(--accent-secondary)' : (stat.deviation > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'),
                  fontWeight: Math.abs(stat.deviation) > 5 ? 'bold' : 'normal'
                }}>
                  {stat.deviation > 0 ? '+' : ''}{stat.deviation.toFixed(1)}% vs moyenne
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {zoneAnalysis.dominantZone && zoneAnalysis.maxDeviation > 10 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem',
          fontSize: '0.95rem', 
          color: 'var(--accent-primary)', 
          fontWeight: 'bold',
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '2px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <span>
            {selectedPlayerName} meurt significativement plus souvent en zone {zoneAnalysis.dominantZone} 
            ({'+' + zoneAnalysis.maxDeviation.toFixed(1)}% par rapport à la moyenne)
          </span>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { usePotionScrollStats } from '../../hooks/usePotionScrollStats';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS, CHART_LIMITS } from '../../config/chartConstants';
import type { CampFilter, PlayerPotionStats, PlayerScrollUsageStats, PlayerScrollTargetStats } from '../../hooks/utils/potionScrollStatsUtils';

type ViewTab = 'potions' | 'scrollsUsed' | 'scrollsReceived';

type ChartPotionStat = PlayerPotionStats & { isHighlightedAddition?: boolean };
type ChartScrollUsageStat = PlayerScrollUsageStats & { isHighlightedAddition?: boolean };
type ChartScrollTargetStat = PlayerScrollTargetStats & { isHighlightedAddition?: boolean };

const minGamesOptions = MIN_GAMES_OPTIONS.COMPACT;

export function PotionScrollStatsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();

  const [selectedView, setSelectedView] = useState<ViewTab>(
    (navigationState.potionScrollStatsState?.selectedView as ViewTab) || 'potions'
  );
  const [minGames, setMinGames] = useState<number>(
    navigationState.potionScrollStatsState?.minGames || MIN_GAMES_DEFAULTS.STANDARD
  );
  const [campFilter, setCampFilter] = useState<CampFilter>(
    (navigationState.potionScrollStatsState?.campFilter as CampFilter) || 'all'
  );
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const { data, isLoading, error } = usePotionScrollStats(campFilter);
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Persist state to NavigationContext
  useEffect(() => {
    const current = navigationState.potionScrollStatsState;
    if (!current ||
        current.minGames !== minGames ||
        current.campFilter !== campFilter ||
        current.selectedView !== selectedView) {
      updateNavigationState({
        potionScrollStatsState: { minGames, campFilter, selectedView }
      });
    }
  }, [minGames, campFilter, selectedView, updateNavigationState]);

  // ── Potion chart data ──────────────────────────────────────────────
  const { totalPotionData, highlightedAddedTotalPotion } = useMemo(() => {
    if (!data?.potionStats) return { totalPotionData: [] as ChartPotionStat[], highlightedAddedTotalPotion: false };
    const sorted = [...data.potionStats].sort((a, b) => b.totalPotions - a.totalPotions).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartPotionStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.potionStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { totalPotionData: final, highlightedAddedTotalPotion: added };
  }, [data, settings.highlightedPlayer]);

  const { normalizedPotionData, highlightedAddedNormPotion } = useMemo(() => {
    if (!data?.potionStats) return { normalizedPotionData: [] as ChartPotionStat[], highlightedAddedNormPotion: false };
    const eligible = data.potionStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.potionsPerGame - a.potionsPerGame).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartPotionStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.potionStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { normalizedPotionData: final, highlightedAddedNormPotion: added };
  }, [data, minGames, settings.highlightedPlayer]);

  // ── Scroll usage chart data ────────────────────────────────────────
  const { totalScrollData, highlightedAddedTotalScroll } = useMemo(() => {
    if (!data?.scrollUsageStats) return { totalScrollData: [] as ChartScrollUsageStat[], highlightedAddedTotalScroll: false };
    const sorted = [...data.scrollUsageStats].filter(s => s.totalScrollsUsed > 0).sort((a, b) => b.totalScrollsUsed - a.totalScrollsUsed).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartScrollUsageStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.scrollUsageStats.find(p => p.player === settings.highlightedPlayer);
      if (hp && hp.totalScrollsUsed > 0) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { totalScrollData: final, highlightedAddedTotalScroll: added };
  }, [data, settings.highlightedPlayer]);

  const { normalizedScrollData, highlightedAddedNormScroll } = useMemo(() => {
    if (!data?.scrollUsageStats) return { normalizedScrollData: [] as ChartScrollUsageStat[], highlightedAddedNormScroll: false };
    const eligible = data.scrollUsageStats.filter(p => p.gamesPlayed >= minGames && p.totalScrollsUsed > 0);
    const sorted = [...eligible].sort((a, b) => b.scrollsPerGame - a.scrollsPerGame).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartScrollUsageStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.scrollUsageStats.find(p => p.player === settings.highlightedPlayer);
      if (hp && hp.totalScrollsUsed > 0) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { normalizedScrollData: final, highlightedAddedNormScroll: added };
  }, [data, minGames, settings.highlightedPlayer]);

  // ── Scroll target chart data ───────────────────────────────────────
  const { totalTargetData, highlightedAddedTotalTarget } = useMemo(() => {
    if (!data?.scrollTargetStats) return { totalTargetData: [] as ChartScrollTargetStat[], highlightedAddedTotalTarget: false };
    const sorted = [...data.scrollTargetStats].sort((a, b) => b.timesTargeted - a.timesTargeted).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartScrollTargetStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.scrollTargetStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { totalTargetData: final, highlightedAddedTotalTarget: added };
  }, [data, settings.highlightedPlayer]);

  const { normalizedTargetData, highlightedAddedNormTarget } = useMemo(() => {
    if (!data?.scrollTargetStats) return { normalizedTargetData: [] as ChartScrollTargetStat[], highlightedAddedNormTarget: false };
    const eligible = data.scrollTargetStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.targetedPerGame - a.targetedPerGame).slice(0, CHART_LIMITS.TOP_20);
    const inTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let final: ChartScrollTargetStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !inTop) {
      const hp = data.scrollTargetStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) { final.push({ ...hp, isHighlightedAddition: true }); added = true; }
    }
    return { normalizedTargetData: final, highlightedAddedNormTarget: added };
  }, [data, minGames, settings.highlightedPlayer]);

  // ── Loading / error ────────────────────────────────────────────────
  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de potions et parchemins...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!data) return <div className="donnees-manquantes">Aucune donnée de potions/parchemins disponible</div>;

  const eligibleCount = selectedView === 'potions'
    ? data.potionStats.filter(p => p.gamesPlayed >= minGames).length
    : selectedView === 'scrollsUsed'
      ? data.scrollUsageStats.filter(p => p.gamesPlayed >= minGames && p.totalScrollsUsed > 0).length
      : data.scrollTargetStats.filter(p => p.gamesPlayed >= minGames).length;

  // ── Shared render helpers ──────────────────────────────────────────
  const viewTabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: active ? 'var(--bg-primary)' : 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xAxisTick = ({ x, y, payload }: any) => (
    <text
      x={x} y={y} dy={16} textAnchor="end"
      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
      fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
      transform={`rotate(-45 ${x} ${y})`}
    >
      {payload.value}
    </text>
  );

  function renderBar(dataKey: string) {
    return (
      <Bar
        dataKey={dataKey}
        shape={(props) => {
          const { x, y, width, height, payload } = props;
          const entry = payload as { player: string; isHighlightedAddition?: boolean };
          const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
          const isHovered = hoveredPlayer === entry.player;
          const isHighlightedAddition = entry.isHighlightedAddition;
          const playerColor = playersColor[entry.player] || 'var(--chart-primary)';

          return (
            <Rectangle
              x={x} y={y} width={width} height={height}
              fill={playerColor}
              stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHovered ? '#000000' : 'none'}
              strokeWidth={isHighlightedFromSettings ? 3 : isHovered ? 2 : 0}
              strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
              opacity={isHighlightedAddition ? 0.8 : 1}
              onClick={() => navigateToGameDetails({ selectedPlayer: entry.player, fromComponent: 'Potions & Parchemins' })}
              onMouseEnter={() => setHoveredPlayer(entry.player)}
              onMouseLeave={() => setHoveredPlayer(null)}
              style={{ cursor: 'pointer' }}
            />
          );
        }}
      />
    );
  }

  function renderHighlightedNote(added: boolean) {
    if (!added || !settings.highlightedPlayer) return null;
    return (
      <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary-text)', fontStyle: 'italic', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
        🎯 &quot;{settings.highlightedPlayer}&quot; affiché en plus du top 20
      </p>
    );
  }

  const campFilterSelect = (id: string) => (
    <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <label htmlFor={id} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Camp:</label>
      <select id={id} value={campFilter} onChange={(e) => setCampFilter(e.target.value as CampFilter)}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>
        <option value="all">Tous les camps</option>
        <option value="villageois">Camp Villageois</option>
        <option value="loup">Camp Loup</option>
        <option value="autres">Autres (Solo)</option>
      </select>
    </div>
  );

  const campAndMinGamesControls = (campId: string, minId: string) => (
    <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <label htmlFor={campId} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Camp:</label>
      <select id={campId} value={campFilter} onChange={(e) => setCampFilter(e.target.value as CampFilter)}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>
        <option value="all">Tous les camps</option>
        <option value="villageois">Camp Villageois</option>
        <option value="loup">Camp Loup</option>
        <option value="autres">Autres (Solo)</option>
      </select>
      <label htmlFor={minId} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>Min. parties:</label>
      <select id={minId} value={minGames} onChange={(e) => setMinGames(Number(e.target.value))}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>
        {minGamesOptions.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );

  // ── Tooltip helpers ────────────────────────────────────────────────
  function potionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPotionStat }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
        <div>Parties jouées: {d.gamesPlayed}</div>
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
          <strong>Potions:</strong>
        </div>
        <div>Total: {d.totalPotions}</div>
        <div>Par partie: {d.potionsPerGame.toFixed(2)}</div>
        {d.isHighlightedAddition && (
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
            🎯 Affiché via sélection personnelle
            {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
          </div>
        )}
      </div>
    );
  }

  function scrollUsageTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartScrollUsageStat }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
        <div>Parties jouées: {d.gamesPlayed}</div>
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
          <strong>Parchemins utilisés:</strong>
        </div>
        <div>Total: {d.totalScrollsUsed}</div>
        <div>Par partie: {d.scrollsPerGame.toFixed(2)}</div>
        {d.isHighlightedAddition && (
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
            🎯 Affiché via sélection personnelle
            {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
          </div>
        )}
      </div>
    );
  }

  function scrollTargetTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartScrollTargetStat }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
        <div>Parties jouées: {d.gamesPlayed}</div>
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
          <strong>Parchemins reçus:</strong>
        </div>
        <div>Total: {d.timesTargeted}</div>
        <div>Par partie: {d.targetedPerGame.toFixed(2)}</div>
        {d.isHighlightedAddition && (
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
            🎯 Affiché via sélection personnelle
            {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
          </div>
        )}
      </div>
    );
  }

  // ── Chart section renderer ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderChartPair(
    title1: string,
    data1: Array<{ player: string; isHighlightedAddition?: boolean }>,
    dataKey1: string,
    yLabel1: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tooltip1: (props: any) => React.ReactNode,
    highlighted1: boolean,
    title2: string,
    data2: Array<{ player: string; isHighlightedAddition?: boolean }>,
    dataKey2: string,
    yLabel2: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tooltip2: (props: any) => React.ReactNode,
    highlighted2: boolean,
    campId1: string,
    campId2: string,
    minId: string,
    footnoteTotal: string,
    footnoteNormalized: string,
  ) {
    return (
      <div className="lycans-graphiques-groupe">
        {/* Total chart */}
        <div className="lycans-graphique-section">
          <div>
            <h3>{title1}</h3>
            {renderHighlightedNote(highlighted1)}
          </div>
          {campFilterSelect(campId1)}
          <FullscreenChart title={title1}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data1} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="player" angle={-45} textAnchor="end" height={80} interval={0} tick={xAxisTick} />
                  <YAxis label={{ value: yLabel1, angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }} allowDecimals={false} />
                  <Tooltip content={tooltip1} />
                  {renderBar(dataKey1)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {data1.length} des joueurs (tous joueurs inclus)
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            {footnoteTotal}
          </p>
        </div>

        {/* Normalized chart */}
        <div className="lycans-graphique-section">
          <div>
            <h3>{title2}</h3>
            {renderHighlightedNote(highlighted2)}
          </div>
          {campAndMinGamesControls(campId2, minId)}
          <FullscreenChart title={title2}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data2} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="player" angle={-45} textAnchor="end" height={80} interval={0} tick={xAxisTick} />
                  <YAxis label={{ value: yLabel2, angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }} />
                  <Tooltip content={tooltip2} />
                  {renderBar(dataKey2)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {data2.length} des joueurs (sur {eligibleCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            {footnoteNormalized}
          </p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="lycans-players-stats">
      <h2>Potions & Parchemins</h2>
      <p className="lycans-stats-info">
        {data.gamesWithActionData} parties avec données d'actions analysées.
      </p>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button type="button" onClick={() => setSelectedView('potions')} style={viewTabStyle(selectedView === 'potions')}>
          🧪 Potions
        </button>
        <button type="button" onClick={() => setSelectedView('scrollsUsed')} style={viewTabStyle(selectedView === 'scrollsUsed')}>
          📜 Parchemins Utilisés
        </button>
        <button type="button" onClick={() => setSelectedView('scrollsReceived')} style={viewTabStyle(selectedView === 'scrollsReceived')}>
          🎯 Parchemins Reçus
        </button>
      </div>

      {/* Potions view */}
      {selectedView === 'potions' && renderChartPair(
        'Total Potions Bues', totalPotionData, 'totalPotions', 'Potions bues', potionTooltip, highlightedAddedTotalPotion,
        'Potions par Partie', normalizedPotionData, 'potionsPerGame', 'Potions / partie', potionTooltip, highlightedAddedNormPotion,
        'camp-potion-total', 'camp-potion-norm', 'min-potion',
        `Calculé sur ${data.gamesWithActionData} parties avec données d'actions`,
        `Moyenne par partie · Calculé sur ${data.gamesWithActionData} parties avec données`,
      )}

      {/* Scrolls used view */}
      {selectedView === 'scrollsUsed' && renderChartPair(
        'Total Parchemins Utilisés', totalScrollData, 'totalScrollsUsed', 'Parchemins utilisés', scrollUsageTooltip, highlightedAddedTotalScroll,
        'Parchemins Utilisés par Partie', normalizedScrollData, 'scrollsPerGame', 'Parchemins / partie', scrollUsageTooltip, highlightedAddedNormScroll,
        'camp-scroll-total', 'camp-scroll-norm', 'min-scroll',
        `Calculé sur ${data.gamesWithActionData} parties avec données d'actions`,
        `Moyenne par partie · Calculé sur ${data.gamesWithActionData} parties avec données`,
      )}

      {/* Scrolls received view */}
      {selectedView === 'scrollsReceived' && renderChartPair(
        'Joueurs les Plus Ciblés par Parchemins', totalTargetData, 'timesTargeted', 'Fois ciblé', scrollTargetTooltip, highlightedAddedTotalTarget,
        'Ciblé par Parchemin par Partie', normalizedTargetData, 'targetedPerGame', 'Ciblé / partie', scrollTargetTooltip, highlightedAddedNormTarget,
        'camp-target-total', 'camp-target-norm', 'min-target',
        `Calculé sur ${data.gamesWithActionData} parties avec données d'actions`,
        `Moyenne par partie · Calculé sur ${data.gamesWithActionData} parties avec données`,
      )}
    </div>
  );
}
